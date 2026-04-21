const { Op } = require('sequelize');
const db = require('../models');
const { success, notFound, error } = require('../utils/response');

// KPIs financiers détaillés d'un projet
exports.getProjectAnalysis = async (req, res) => {
  try {
    const project = await db.Project.findByPk(req.params.id, {
      include: [{ model: db.Transaction, as: 'transactions' }],
    });
    if (!project) return notFound(res, 'Projet introuvable');

    const txs = project.transactions || [];
    const expenses = txs.filter(t => t.type === 'expense');
    const invoices  = txs.filter(t => t.type === 'invoice');

    const totalDepenses       = expenses.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const totalFacture        = invoices.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const facturesPaye        = invoices.filter(t => t.status === 'Payé').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const facturesImpayees    = invoices.filter(t => t.status !== 'Payé' && t.status !== 'Rejeté').reduce((s, t) => s + parseFloat(t.amount || 0), 0);

    const budgetTotal         = parseFloat(project.budget || 0);
    const montantMarche       = parseFloat(project.montantMarche || budgetTotal);
    const ecartAbsolu         = budgetTotal - totalDepenses;
    const ecartPct            = budgetTotal > 0 ? ((ecartAbsolu / budgetTotal) * 100).toFixed(1) : 0;
    const tauxConsommation    = budgetTotal > 0 ? Math.round((totalDepenses / budgetTotal) * 100) : 0;
    const margeReelle         = totalFacture - totalDepenses;
    const tauxMarge           = totalFacture > 0 ? Math.round((margeReelle / totalFacture) * 100) : 0;
    const honorairesAFacturer = Math.max(0, montantMarche - totalFacture);
    const rentabilite         = budgetTotal > 0 ? Math.round((margeReelle / budgetTotal) * 100) : 0;

    // Répartition des dépenses par catégorie
    const depensesParCategorie = expenses.reduce((acc, t) => {
      const cat = t.category || 'Non classé';
      acc[cat] = (acc[cat] || 0) + parseFloat(t.amount || 0);
      return acc;
    }, {});

    // Budget items vs réel (si budgetItems renseigné)
    const budgetItems = (project.budgetItems || []).map(item => {
      const reel = depensesParCategorie[item.poste] || 0;
      return {
        poste:        item.poste,
        montantPrevu: item.montantPrevu,
        montantReel:  reel,
        ecart:        item.montantPrevu - reel,
        ecartPct:     item.montantPrevu > 0 ? Math.round(((item.montantPrevu - reel) / item.montantPrevu) * 100) : 0,
      };
    });

    // Projection à terminaison (EAC)
    // Si avancement = 0 : pas encore de données suffisantes → EAC = budget (on ne peut pas projeter)
    // Si avancement > 0 : EAC = coûts engagés / avancement × 100
    const progress = project.progress || 0;
    const eac = progress > 0
      ? Math.round((totalDepenses / progress) * 100)
      : budgetTotal; // fallback : budget prévu si pas encore d'avancement
    const projectionEcart = budgetTotal - eac;

    // Factures impayées en retard
    const today = new Date().toISOString().split('T')[0];
    const impayeesEnRetard = invoices.filter(t =>
      t.status !== 'Payé' && t.status !== 'Rejeté' && t.dueDate && t.dueDate < today
    ).length;

    return success(res, {
      projectId:           project.id,
      projectName:         project.name,
      budgetTotal,
      montantMarche,
      totalDepenses,
      totalFacture,
      facturesPaye,
      facturesImpayees,
      honorairesAFacturer,
      ecartAbsolu,
      ecartPct:            Number(ecartPct),
      tauxConsommation,
      margeReelle,
      tauxMarge,
      rentabilite,
      eac,
      projectionEcart,
      impayeesEnRetard,
      depensesParCategorie,
      budgetItems,
    });
  } catch (err) { return error(res, 'Erreur analyse financière', 500, err.message); }
};

// KPIs tous projets (tableau de bord)
exports.getAllProjectsKPIs = async (req, res) => {
  try {
    const { role, user } = req;
    const where = {};
    if (role === 'chef') where.chefId = user.id;

    const projects = await db.Project.findAll({
      where,
      include: [{ model: db.Transaction, as: 'transactions' }],
    });

    const kpis = projects.map(p => {
      const txs      = p.transactions || [];
      const depenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
      const ca       = txs.filter(t => t.type === 'invoice').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
      const budget   = parseFloat(p.budget || 0);
      const marge    = ca - depenses;
      const tauxMarge     = ca > 0 ? Math.round((marge / ca) * 100) : 0;
      const tauxConso     = budget > 0 ? Math.round((depenses / budget) * 100) : 0;
      const ecartBudget   = budget - depenses;
      const rentabilite   = budget > 0 ? Math.round((marge / budget) * 100) : 0;

      const today = new Date().toISOString().split('T')[0];
      const impayesCount = txs.filter(t =>
        t.type === 'invoice' && t.status !== 'Payé' && t.status !== 'Rejeté' && t.dueDate && t.dueDate < today
      ).length;

      return {
        id: p.id, code: p.code, name: p.name,
        status: p.status, progress: p.progress,
        budget, depenses, ca, marge,
        tauxMarge, tauxConso, ecartBudget, rentabilite,
        impayesCount,
        alert: ca === 0 ? 'neutral' : tauxMarge < 5 ? 'danger' : tauxMarge < 15 ? 'warning' : 'ok',
      };
    });

    const totals = {
      budget:      kpis.reduce((s, k) => s + k.budget, 0),
      depenses:    kpis.reduce((s, k) => s + k.depenses, 0),
      ca:          kpis.reduce((s, k) => s + k.ca, 0),
      marge:       kpis.reduce((s, k) => s + k.marge, 0),
      impayesTotal:kpis.reduce((s, k) => s + k.impayesCount, 0),
    };
    totals.tauxMargeGlobal = totals.ca > 0 ? Math.round((totals.marge / totals.ca) * 100) : 0;

    return success(res, { kpis, totals });
  } catch (err) { return error(res, 'Erreur KPIs', 500, err.message); }
};

// Relance impayés
exports.sendReminder = async (req, res) => {
  try {
    const transaction = await db.Transaction.findByPk(req.params.id);
    if (!transaction) return notFound(res, 'Transaction introuvable');
    if (transaction.type !== 'invoice') return error(res, 'Seules les factures peuvent être relancées', 400);

    await transaction.increment('reminderCount');
    await db.Log.create({
      action: `Relance #${transaction.reminderCount + 1} — Facture ${transaction.reference}`,
      module: 'Finances', entityType: 'Transaction', entityId: transaction.id,
      userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
    });
    return success(res, { reminderCount: transaction.reminderCount + 1 }, 'Relance enregistrée');
  } catch (err) { return error(res, 'Erreur', 500, err.message); }
};

// Journal comptable
exports.getAccountingJournal = async (req, res) => {
  try {
    const where = {};
    if (req.query.projectId) where.projectId = req.query.projectId;
    if (req.query.from && req.query.to) where.journalDate = { [Op.between]: [req.query.from, req.query.to] };
    const entries = await db.AccountingEntry.findAll({
      where,
      include: [{ model: db.Project, as: 'project', attributes: ['id', 'name', 'code'] }],
      order: [['journalDate', 'DESC']],
    });
    return success(res, entries);
  } catch (err) { return error(res, 'Erreur journal', 500, err.message); }
};
