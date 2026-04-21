const db = require('../models');
const { success, created, notFound, error, badRequest } = require('../utils/response');

exports.getAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.status)   where.status   = req.query.status;
    if (req.query.priority) where.priority = req.query.priority;
    // Chaque rôle voit ses propres tickets (sauf DG qui voit tout)
    if (req.role !== 'dg') where.createdBy = req.user.id;
    const tickets = await db.Ticket.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
    return success(res, tickets);
  } catch (err) {
    return error(res, 'Erreur lors de la récupération des tickets', 500, err.message);
  }
};

exports.create = async (req, res) => {
  try {
    const { title, module: mod, priority, description } = req.body;
    if (!title || !description) return badRequest(res, 'Titre et description sont obligatoires');
    const ticket = await db.Ticket.create({
      title, module: mod, priority, description,
      createdBy: req.user.id, createdByRole: req.role,
    });
    return created(res, ticket, 'Ticket créé avec succès');
  } catch (err) {
    return error(res, 'Erreur lors de la création', 500, err.message);
  }
};

exports.update = async (req, res) => {
  try {
    const ticket = await db.Ticket.findByPk(req.params.id);
    if (!ticket) return notFound(res, 'Ticket introuvable');
    await ticket.update(req.body);
    return success(res, ticket, 'Ticket mis à jour');
  } catch (err) {
    return error(res, 'Erreur', 500, err.message);
  }
};

exports.remove = async (req, res) => {
  try {
    const ticket = await db.Ticket.findByPk(req.params.id);
    if (!ticket) return notFound(res, 'Ticket introuvable');
    await ticket.destroy();
    return success(res, null, 'Ticket supprimé');
  } catch (err) {
    return error(res, 'Erreur', 500, err.message);
  }
};
