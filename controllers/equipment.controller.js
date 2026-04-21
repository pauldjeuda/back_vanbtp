const db = require('../models');
const { success, created, notFound, error, badRequest } = require('../utils/response');

exports.getAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.projectId) where.projectId = req.query.projectId;
    if (req.query.status)    where.status    = req.query.status;
    if (req.role === 'chef') {
      const projects = await db.Project.findAll({ where: { chefId: req.user.id }, attributes: ['id'] });
      if (!req.query.projectId) where.projectId = projects.map(p => p.id);
    }
    const equipment = await db.Equipment.findAll({
      where,
      include: [{ model: db.Project, as: 'project', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']],
    });
    return success(res, equipment);
  } catch (err) {
    return error(res, 'Erreur lors de la récupération des engins', 500, err.message);
  }
};

exports.getById = async (req, res) => {
  try {
    const eq = await db.Equipment.findByPk(req.params.id, {
      include: [{ model: db.Project, as: 'project', attributes: ['id', 'name'] }],
    });
    if (!eq) return notFound(res, 'Engin introuvable');
    return success(res, eq);
  } catch (err) {
    return error(res, 'Erreur', 500, err.message);
  }
};

exports.create = async (req, res) => {
  try {
    const { name, ref } = req.body;
    if (!name) return badRequest(res, 'Le nom de l\'engin est obligatoire');
    const eq = await db.Equipment.create(req.body);
    await db.Log.create({
      action: `Ajout de l'engin : ${name} (${ref || 'sans ref'})`,
      module: 'Ressources', entityType: 'Equipment', entityId: eq.id,
      userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
    });
    return created(res, eq, 'Engin ajouté avec succès');
  } catch (err) {
    return error(res, 'Erreur lors de la création', 500, err.message);
  }
};

exports.update = async (req, res) => {
  try {
    const eq = await db.Equipment.findByPk(req.params.id);
    if (!eq) return notFound(res, 'Engin introuvable');
    await eq.update(req.body);
    return success(res, eq, 'Engin mis à jour');
  } catch (err) {
    return error(res, 'Erreur lors de la mise à jour', 500, err.message);
  }
};

exports.remove = async (req, res) => {
  try {
    const eq = await db.Equipment.findByPk(req.params.id);
    if (!eq) return notFound(res, 'Engin introuvable');
    await eq.destroy();
    return success(res, null, 'Engin supprimé');
  } catch (err) {
    return error(res, 'Erreur lors de la suppression', 500, err.message);
  }
};
