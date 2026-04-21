/**
 * controllers/project.controller.js
 * CRUD chantiers avec filtrage par rôle (DG voit tout, Chef voit les siens).
 */
const { Op } = require('sequelize');
const db = require('../models');
const { success, created, notFound, error, badRequest } = require('../utils/response');

exports.getAll = async (req, res) => {
  try {
    const { role, user } = req;
    const where = {};

    // Chef : uniquement ses chantiers
    if (role === 'chef') where.chefId = user.id;

    // Technicien : chantier de son affectation courante
    if (role === 'technicien') {
      const emp = await db.Employee.findOne({ where: { matricule: user.matricule } });
      if (emp?.projectId) where.id = emp.projectId;
      else return success(res, []);
    }

    // Filtres query string
    if (req.query.region)  where.region = req.query.region;
    if (req.query.status)  where.status = req.query.status;

    const projects = await db.Project.findAll({
      where,
      include: [{ model: db.Chef, as: 'chef', attributes: ['id', 'nom', 'prenom', 'matricule'] }],
      order: [['createdAt', 'DESC']],
    });
    return success(res, projects);
  } catch (err) {
    return error(res, 'Erreur lors de la récupération des projets', 500, err.message);
  }
};

exports.getById = async (req, res) => {
  try {
    const project = await db.Project.findByPk(req.params.id, {
      include: [
        { model: db.Chef, as: 'chef', attributes: ['id', 'nom', 'prenom'] },
        { model: db.Employee, as: 'employees' },
        { model: db.Transaction, as: 'transactions' },
        { model: db.Subcontract, as: 'subcontracts', include: [{ model: db.SubcontractTask, as: 'tasks' }] },
      ],
    });
    if (!project) return notFound(res, 'Projet introuvable');
    return success(res, project);
  } catch (err) {
    return error(res, 'Erreur lors de la récupération du projet', 500, err.message);
  }
};

exports.create = async (req, res) => {
  try {
    const {
      code, name, client, budget, location, region, startDate, endDate, status,
      category, subCategory, montantMarche, budgetItems, parentId, manager, progress,
    } = req.body;
    if (!code || !name || !client) {
      return badRequest(res, 'Le code, le nom et le client sont obligatoires');
    }

    const project = await db.Project.create({
      code, name, client,
      budget:        budget || 0,
      montantMarche: montantMarche || budget || 0,
      location, region, startDate, endDate,
      status:      status      || 'Planifié',
      category:    category    || 'Autre',
      subCategory: (subCategory && subCategory.trim()) ? subCategory.trim() : null,
      budgetItems: budgetItems || [],
      parentId:    parentId    || null,
      manager:     manager      || null,
      progress:    progress !== undefined ? Number(progress) : 0,
      chefId:      req.user.id,
    });

    // Logger l'action
    await db.Log.create({
      action: `Création du projet : ${name}`,
      module: 'Projets', entityType: 'Project', entityId: project.id,
      userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
    });

    return created(res, project, 'Projet créé avec succès');
  } catch (err) {
    return error(res, 'Erreur lors de la création du projet', 500, err.message);
  }
};

exports.update = async (req, res) => {
  try {
    const project = await db.Project.findByPk(req.params.id);
    if (!project) return notFound(res, 'Projet introuvable');

    // Chef ne peut modifier que ses propres projets
    if (req.role === 'chef' && project.chefId !== req.user.id) {
      return error(res, 'Vous ne pouvez modifier que vos propres projets', 403);
    }

    const { body } = req;
    // Si progress est absent du body ET le statut n'a pas changé,
    // préserver la progression calculée depuis les tâches (ProjectTask)
    if (body.progress === undefined && body.status && body.status === project.status) {
      // statut inchangé → ne pas toucher progress
      delete body.progress;
    } else if (body.progress === undefined && body.status && body.status !== project.status) {
      // statut changé → calculer progress depuis le statut
      const STATUS_PROGRESS = {
        'préparation': 0,
        'lancement': 15,
        'exécution': 40,
        'suivi': 65,
        'contrôle': 85,
        'clôture': 100,
        'Planifié': 0,
        'En cours': 40,
        'Terminé': 100,
        'Suspendu': project.progress || 0
      };
      body.progress = STATUS_PROGRESS[body.status] ?? project.progress ?? 0;
    }

    // Normaliser subCategory: ne pas envoyer de string vide à l'ENUM
    if (body.subCategory !== undefined && !body.subCategory?.trim()) {
      body.subCategory = null;
    }
    await project.update(body);

    await db.Log.create({
      action: `Modification du projet : ${project.name}`,
      module: 'Projets', entityType: 'Project', entityId: project.id,
      userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
    });

    return success(res, project, 'Projet mis à jour');
  } catch (err) {
    return error(res, 'Erreur lors de la mise à jour du projet', 500, err.message);
  }
};

exports.remove = async (req, res) => {
  try {
    const project = await db.Project.findByPk(req.params.id);
    if (!project) return notFound(res, 'Projet introuvable');

    if (req.role === 'chef' && project.chefId !== req.user.id) {
      return error(res, 'Vous ne pouvez supprimer que vos propres projets', 403);
    }

    await project.destroy();
    return success(res, null, 'Projet supprimé');
  } catch (err) {
    return error(res, 'Erreur lors de la suppression du projet', 500, err.message);
  }
};
