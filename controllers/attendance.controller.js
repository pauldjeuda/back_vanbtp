const db = require('../models');
const { success, created, notFound, error, badRequest } = require('../utils/response');

exports.getAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.projectId)  where.projectId  = req.query.projectId;
    if (req.query.employeeId) where.employeeId = req.query.employeeId;
    if (req.query.date)       where.date        = req.query.date;
    if (req.query.status)     where.status      = req.query.status;

    if (req.role === 'chef') {
      const projects = await db.Project.findAll({ where: { chefId: req.user.id }, attributes: ['id'] });
      if (!req.query.projectId) where.projectId = projects.map(p => p.id);
    }

    const records = await db.Attendance.findAll({
      where,
      include: [
        { model: db.Employee, as: 'employee', attributes: ['id', 'name', 'matricule', 'role'] },
        { model: db.Project, as: 'project', attributes: ['id', 'name'] },
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
    });
    return success(res, records);
  } catch (err) {
    return error(res, 'Erreur lors de la récupération des pointages', 500, err.message);
  }
};

exports.bulkCreate = async (req, res) => {
  try {
    const { projectId, date, records } = req.body;
    if (!projectId || !date || !Array.isArray(records) || !records.length) {
      return badRequest(res, 'projectId, date et records[] sont obligatoires');
    }

    const created_records = [];
    for (const r of records) {
      if (!r.employeeId) continue;

      // Calculer les minutes de retard (heure standard 07h30)
      let lateMinutes = 0;
      if (r.arrivalTime && r.status === 'Présent') {
        const [h, m] = r.arrivalTime.split(':').map(Number);
        const arrivalMins = h * 60 + m;
        const standardMins = 7 * 60 + 30;
        if (arrivalMins > standardMins) lateMinutes = arrivalMins - standardMins;
        if (lateMinutes > 0) r.status = 'Retard';
      }

      // Upsert : un seul pointage par employé par jour
      const [record] = await db.Attendance.upsert({
        employeeId: r.employeeId, projectId, date,
        arrivalTime: r.arrivalTime || null,
        departureTime: r.departureTime || null,
        status: r.status || 'Présent',
        lateMinutes,
        note: r.note || null,
        recordedBy: req.user.id,
      }, { returning: true });
      created_records.push(record);
    }

    await db.Log.create({
      action: `Pointage enregistré : ${created_records.length} employé(s) — ${date}`,
      module: 'Ressources', entityType: 'Attendance', entityId: projectId,
      userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
    });

    return success(res, created_records, 'Pointage enregistré avec succès');
  } catch (err) {
    return error(res, 'Erreur lors du pointage', 500, err.message);
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const records = await db.Attendance.findAll({
      where: { employeeId },
      include: [{ model: db.Project, as: 'project', attributes: ['id', 'name'] }],
      order: [['date', 'DESC']],
      limit: 90,
    });
    return success(res, records);
  } catch (err) {
    return error(res, 'Erreur', 500, err.message);
  }
};
