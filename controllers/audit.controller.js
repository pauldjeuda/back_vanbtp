const db = require('../models');
const { success, created, notFound, error, badRequest } = require('../utils/response');

exports.getAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.projectId) where.projectId = req.query.projectId;
    if (req.role === 'chef') {
      const projects = await db.Project.findAll({ where: { chefId: req.user.id }, attributes: ['id'] });
      if (!req.query.projectId) where.projectId = projects.map(p => p.id);
    }
    const audits = await db.Audit.findAll({
      where,
      include: [{ model: db.Project, as: 'project', attributes: ['id', 'name'] }],
      order: [['auditDate', 'DESC']],
    });
    return success(res, audits);
  } catch (err) {
    return error(res, 'Erreur lors de la récupération des audits', 500, err.message);
  }
};

exports.create = async (req, res) => {
  try {
    const { title, auditDate, projectId } = req.body;
    if (!title || !auditDate || !projectId) {
      return badRequest(res, 'Titre, date et projet sont obligatoires');
    }
    const audit = await db.Audit.create({
      ...req.body,
      auditor: `${req.user.prenom} ${req.user.nom}`,
      createdBy: req.user.id,
    });
    await db.Log.create({
      action: `Audit créé : ${title}`,
      module: 'Contrôle', entityType: 'Audit', entityId: audit.id,
      userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
    });
    return created(res, audit, 'Audit créé avec succès');
  } catch (err) {
    return error(res, 'Erreur lors de la création', 500, err.message);
  }
};

exports.update = async (req, res) => {
  try {
    const audit = await db.Audit.findByPk(req.params.id);
    if (!audit) return notFound(res, 'Audit introuvable');
    await audit.update(req.body);
    return success(res, audit, 'Audit mis à jour');
  } catch (err) {
    return error(res, 'Erreur', 500, err.message);
  }
};

exports.remove = async (req, res) => {
  try {
    const audit = await db.Audit.findByPk(req.params.id);
    if (!audit) return notFound(res, 'Audit introuvable');
    await audit.destroy();
    return success(res, null, 'Audit supprimé');
  } catch (err) {
    return error(res, 'Erreur', 500, err.message);
  }
};
