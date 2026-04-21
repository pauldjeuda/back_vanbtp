const db = require('../models');
const { success, created, notFound, error, badRequest } = require('../utils/response');

exports.getAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.projectId) where.projectId = req.query.projectId;
    if (req.query.type)      where.type      = req.query.type;
    if (req.query.status)    where.status    = req.query.status;

    // Chef : uniquement les transactions de ses projets
    if (req.role === 'chef') {
      const projects = await db.Project.findAll({ where: { chefId: req.user.id }, attributes: ['id'] });
      where.projectId = projects.map(p => p.id);
    }

    const transactions = await db.Transaction.findAll({
      where,
      include: [{ model: db.Project, as: 'project', attributes: ['id', 'name', 'code'] }],
      order: [['transactionDate', 'DESC']],
    });
    return success(res, transactions);
  } catch (err) {
    return error(res, 'Erreur lors de la récupération des transactions', 500, err.message);
  }
};

exports.create = async (req, res) => {
  try {
    const { projectId, type, category, amount, transactionDate } = req.body;
    if (!projectId || !type || !amount || !transactionDate) {
      return badRequest(res, 'Champs obligatoires manquants : projectId, type, amount, transactionDate');
    }

    // Générer la référence
    const prefix = type === 'expense' ? 'DEP' : 'FAC';
    const reference = `${prefix}-${Date.now()}`;

    const transaction = await db.Transaction.create({
      ...req.body, reference, createdBy: req.user.id,
      isClientDebt: req.body.isClientDebt || false,
      debtStatus: req.body.isClientDebt ? 'Non remboursé' : null,
    });

    await db.Log.create({
      action: `Nouvelle ${type === 'expense' ? 'dépense' : 'facture'} : ${amount} FCFA`,
      module: 'Finances', entityType: 'Transaction', entityId: transaction.id,
      userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
    });

    // Génération automatique des écritures comptables
    const jDate = req.body.transactionDate;
    const ref   = transaction.reference;
    if (type === 'invoice') {
      await db.AccountingEntry.bulkCreate([
        { transactionId: transaction.id, projectId: req.body.projectId, journalDate: jDate, label: `Facture ${ref} - ${req.body.client || 'Client'}`, account: '411', accountLabel: 'Clients', debit: parseFloat(amount), credit: 0, reference: ref, createdBy: req.user.id },
        { transactionId: transaction.id, projectId: req.body.projectId, journalDate: jDate, label: `Facture ${ref} - ${req.body.client || 'Client'}`, account: '706', accountLabel: 'Prestations de services', debit: 0, credit: parseFloat(amount), reference: ref, createdBy: req.user.id },
      ]);
    } else {
      await db.AccountingEntry.bulkCreate([
        { transactionId: transaction.id, projectId: req.body.projectId, journalDate: jDate, label: `Dépense ${ref} - ${req.body.provider || 'Fournisseur'}`, account: '601', accountLabel: 'Achats matières', debit: parseFloat(amount), credit: 0, reference: ref, createdBy: req.user.id },
        { transactionId: transaction.id, projectId: req.body.projectId, journalDate: jDate, label: `Dépense ${ref} - ${req.body.provider || 'Fournisseur'}`, account: '401', accountLabel: 'Fournisseurs', debit: 0, credit: parseFloat(amount), reference: ref, createdBy: req.user.id },
      ]);
    }

    return created(res, transaction, 'Transaction enregistrée');
  } catch (err) {
    return error(res, 'Erreur lors de la création de la transaction', 500, err.message);
  }
};

exports.update = async (req, res) => {
  try {
    const transaction = await db.Transaction.findByPk(req.params.id);
    if (!transaction) return notFound(res, 'Transaction introuvable');
    await transaction.update(req.body);
    return success(res, transaction, 'Transaction mise à jour');
  } catch (err) {
    return error(res, 'Erreur lors de la mise à jour', 500, err.message);
  }
};

exports.remove = async (req, res) => {
  try {
    const transaction = await db.Transaction.findByPk(req.params.id);
    if (!transaction) return notFound(res, 'Transaction introuvable');
    await transaction.destroy();
    return success(res, null, 'Transaction supprimée');
  } catch (err) {
    return error(res, 'Erreur lors de la suppression', 500, err.message);
  }
};
