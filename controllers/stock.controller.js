const db = require('../models');
const { success, created, notFound, error, badRequest } = require('../utils/response');

exports.getAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.projectId) where.projectId = req.query.projectId;
    if (req.query.type) where.type = req.query.type;
    if (req.query.warehouse) where.warehouse = req.query.warehouse;
    if (req.role === 'chef') {
      const projects = await db.Project.findAll({ where: { chefId: req.user.id }, attributes: ['id'] });
      if (!req.query.projectId) where.projectId = projects.map(p => p.id);
    }
    if (req.role === 'technicien') {
      const emp = await db.Employee.findOne({ where: { matricule: req.user.matricule } });
      if (emp?.projectId) where.projectId = emp.projectId;
    }
    const movements = await db.StockMovement.findAll({
      where,
      include: [{ model: db.Project, as: 'project', attributes: ['id', 'name'] }],
      order: [['movementDate', 'DESC']],
    });
    return success(res, movements);
  } catch (err) {
    return error(res, 'Erreur lors de la récupération du stock', 500, err.message);
  }
};

exports.create = async (req, res) => {
  try {
    const { type, item, quantity, projectId, movementDate } = req.body;
    if (!type || !item || !quantity || !projectId || !movementDate) {
      return badRequest(res, 'Champs obligatoires : type, item, quantity, projectId, movementDate');
    }

    const project = await db.Project.findByPk(projectId);
    if (!project) return badRequest(res, `Projet ${projectId} introuvable`);

    // Vérification des droits par rôle
    if (req.role === 'chef' && project.chefId !== req.user.id) {
      return badRequest(res, 'Vous ne pouvez créer des mouvements que sur vos propres projets');
    }
    if (req.role === 'technicien') {
      const emp = await db.Employee.findOne({ where: { matricule: req.user.matricule } });
      if (!emp || Number(emp.projectId) !== Number(projectId)) {
        return badRequest(res, 'Vous ne pouvez créer des mouvements que sur votre chantier d\'affectation');
      }
    }

    // ── Vérification du solde pour une Sortie ou Transfert ──────────────────
    if (type === 'Sortie' || type === 'Transfert') {
      const allMovements = await db.StockMovement.findAll({
        where: { item, projectId },
      });
      const totalEntrees = allMovements
        .filter(m => m.type === 'Entrée')
        .reduce((s, m) => s + parseFloat(m.quantity || 0), 0);
      const totalSorties = allMovements
        .filter(m => m.type === 'Sortie' || m.type === 'Transfert')
        .reduce((s, m) => s + parseFloat(m.quantity || 0), 0);
      const soldeDispo = totalEntrees - totalSorties;

      if (parseFloat(quantity) > soldeDispo) {
        return badRequest(res,
          `Stock insuffisant pour "${item}". ` +
          `Solde disponible : ${Math.max(0, soldeDispo)}, demandé : ${quantity}.`
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const movement = await db.StockMovement.create({ ...req.body, warehouse: req.body.warehouse || 'Magasin Principal', createdBy: req.user.id });
    await db.Log.create({
      action: `Stock ${type} : ${quantity} ${req.body.unit || ''} de ${item}`,
      module: 'Stock', entityType: 'StockMovement', entityId: movement.id,
      userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
    });
    return created(res, movement, 'Mouvement de stock enregistré');
  } catch (err) {
    return error(res, 'Erreur lors de la création', 500, err.message);
  }
};

exports.remove = async (req, res) => {
  try {
    const movement = await db.StockMovement.findByPk(req.params.id);
    if (!movement) return notFound(res, 'Mouvement introuvable');
    await movement.destroy();
    return success(res, null, 'Mouvement supprimé');
  } catch (err) {
    return error(res, 'Erreur lors de la suppression', 500, err.message);
  }
};
