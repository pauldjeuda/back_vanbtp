/**
 * controllers/dashboard.controller.js
 * KPIs agrégés — adaptatifs selon le rôle (DG = global, Chef = ses projets).
 */
const { Op } = require('sequelize');
const db = require('../models');
const { success, error } = require('../utils/response');

exports.getKPIs = async (req, res) => {
  try {
    const { role, user } = req;
    const projectWhere = {};
    if (role === 'chef') projectWhere.chefId = user.id;

    // ── Projets ──────────────────────────────────────────────────────────────
    const projects = await db.Project.findAll({ where: projectWhere });
    const projectIds = projects.map(p => p.id);

    const projectStats = {
      total:     projects.length,
      enCours:   projects.filter(p => p.status === 'En cours').length,
      termines:  projects.filter(p => p.status === 'Terminé').length,
      planifies: projects.filter(p => p.status === 'Planifié').length,
      suspendus: projects.filter(p => p.status === 'Suspendu').length,
      budgetTotal: projects.reduce((s, p) => s + parseFloat(p.budget || 0), 0),
      progressionMoyenne: projects.length
        ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length)
        : 0,
    };

    // ── Finances ─────────────────────────────────────────────────────────────
    const transactions = await db.Transaction.findAll({
      where: { projectId: projectIds },
    });
    const depenses  = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const factures  = transactions.filter(t => t.type === 'invoice').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const financeStats = {
      totalDepenses: depenses,
      totalFactures: factures,
      solde: factures - depenses,
      tauxConsommation: projectStats.budgetTotal
        ? Math.round((depenses / projectStats.budgetTotal) * 100)
        : 0,
    };

    // ── Personnel ────────────────────────────────────────────────────────────
    const employees = await db.Employee.findAll({
      where: { projectId: projectIds },
      include: [{ model: db.Project, as: 'currentProject', attributes: ['id', 'name'] }],
    });

    const employeeStats = {
      total: employees.length,
      actifs: employees.filter(e => e.actif !== false).length,
      parProjet: projectIds.map(id => ({
        projectId: id,
        projectName: projects.find(p => p.id === id)?.name || 'Inconnu',
        count: employees.filter(e => e.projectId === id).length,
      })),
    };

    // ── Incidents ────────────────────────────────────────────────────────────
    const incidents = await db.Incident.findAll({
      where: { projectId: projectIds },
    });
    const incidentStats = {
      total:  incidents.length,
      ouverts: incidents.filter(i => i.status === 'Ouvert').length,
      graves:  incidents.filter(i => ['Grave', 'Critique'].includes(i.gravity)).length,
      hse:     incidents.filter(i => i.category === 'hse').length,
      quality: incidents.filter(i => i.category === 'quality').length,
    };

    // ── Logs récents ─────────────────────────────────────────────────────────
    const recentLogs = await db.Log.findAll({
      where: role !== 'dg' ? { userId: user.id } : {},
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    return success(res, {
      role,
      projects: projectStats,
      finances: financeStats,
      personnel: employeeStats,
      incidents: incidentStats,
      recentActivity: recentLogs,
    });
  } catch (err) {
    return error(res, 'Erreur lors du calcul des KPIs', 500, err.message);
  }
};
