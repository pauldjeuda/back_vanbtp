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
    const purchases = await db.Purchase.findAll({
      where,
      include: [{ model: db.Project, as: 'project', attributes: ['id', 'name'] }],
      order: [['purchaseDate', 'DESC']],
    });
    return success(res, purchases);
  } catch (err) {
    return error(res, 'Erreur lors de la récupération des achats', 500, err.message);
  }
};

exports.getById = async (req, res) => {
  try {
    const purchase = await db.Purchase.findByPk(req.params.id, {
      include: [{ model: db.Project, as: 'project', attributes: ['id', 'name'] }],
    });
    if (!purchase) return notFound(res, 'Achat introuvable');
    return success(res, purchase);
  } catch (err) {
    return error(res, 'Erreur', 500, err.message);
  }
};

exports.create = async (req, res) => {
  try {
    const { item, quantity, projectId, purchaseDate } = req.body;
    if (!item || !quantity || !projectId) {
      return badRequest(res, 'Champs obligatoires manquants : item, quantity, projectId');
    }
    // unitPrice et purchaseDate sont optionnels — valeurs par défaut si absents
    if (!req.body.purchaseDate) {
      req.body.purchaseDate = new Date().toISOString().split('T')[0];
    }
    if (req.body.unitPrice === undefined || req.body.unitPrice === null) {
      req.body.unitPrice = 0;
    }
    const ref = `BC-${Date.now()}`;
    const purchase = await db.Purchase.create({ ...req.body, ref, createdBy: req.user.id });
    await db.Log.create({
      action: `Bon de commande créé : ${item} — ${quantity} unités`,
      module: 'Achats', entityType: 'Purchase', entityId: purchase.id,
      userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
    });
    return created(res, purchase, 'Bon de commande créé');
  } catch (err) {
    return error(res, 'Erreur lors de la création', 500, err.message);
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const purchase = await db.Purchase.findByPk(req.params.id);
    if (!purchase) return notFound(res, 'Achat introuvable');
    const { status } = req.body;
    const validStatuses = ['En attente', 'Validé', 'Livré', 'Annulé'];
    if (!validStatuses.includes(status)) {
      return badRequest(res, `Statut invalide. Valeurs acceptées : ${validStatuses.join(', ')}`);
    }
    await purchase.update({ status });
    await db.Log.create({
      action: `Statut de l'achat ${purchase.ref} → ${status}`,
      module: 'Achats', entityType: 'Purchase', entityId: purchase.id,
      userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
    });
    return success(res, purchase, `Achat marqué comme "${status}"`);
  } catch (err) {
    return error(res, 'Erreur lors de la mise à jour du statut', 500, err.message);
  }
};

exports.remove = async (req, res) => {
  try {
    const purchase = await db.Purchase.findByPk(req.params.id);
    if (!purchase) return notFound(res, 'Achat introuvable');
    await purchase.destroy();
    return success(res, null, 'Achat supprimé');
  } catch (err) {
    return error(res, 'Erreur', 500, err.message);
  }
};
