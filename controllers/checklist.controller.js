const db = require('../models');
const { success, created, notFound, error, badRequest } = require('../utils/response');

exports.getAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.projectId) where.projectId = req.query.projectId;
    if (req.role === 'technicien') {
      const emp = await db.Employee.findOne({ where: { matricule: req.user.matricule } });
      if (emp?.projectId) where.projectId = emp.projectId;
    }
    const checklists = await db.Checklist.findAll({
      where,
      include: [
        { model: db.ChecklistTask, as: 'tasks' },
        { model: db.Project, as: 'project', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    return success(res, checklists);
  } catch (err) {
    return error(res, 'Erreur lors de la récupération des checklists', 500, err.message);
  }
};

exports.create = async (req, res) => {
  try {
    const { title, projectId } = req.body;
    if (!title || !projectId) return badRequest(res, 'Titre et projet sont obligatoires');
    const checklist = await db.Checklist.create({ ...req.body, createdBy: req.user.id });
    if (req.body.tasks && Array.isArray(req.body.tasks)) {
      await Promise.all(req.body.tasks.map(t =>
        db.ChecklistTask.create({ title: t.title, checklistId: checklist.id })
      ));
    }
    const result = await db.Checklist.findByPk(checklist.id, {
      include: [{ model: db.ChecklistTask, as: 'tasks' }],
    });
    return created(res, result, 'Checklist créée');
  } catch (err) {
    return error(res, 'Erreur lors de la création', 500, err.message);
  }
};

exports.update = async (req, res) => {
  try {
    const checklist = await db.Checklist.findByPk(req.params.id);
    if (!checklist) return notFound(res, 'Checklist introuvable');
    await checklist.update(req.body);
    return success(res, checklist, 'Checklist mise à jour');
  } catch (err) {
    return error(res, 'Erreur', 500, err.message);
  }
};

exports.toggleTask = async (req, res) => {
  try {
    const task = await db.ChecklistTask.findOne({
      where: { id: req.params.taskId, checklistId: req.params.id },
    });
    if (!task) return notFound(res, 'Tâche introuvable');
    await task.update({
      completed: !task.completed,
      completedAt: !task.completed ? new Date() : null,
      completedBy: !task.completed ? req.user.id : null,
    });
    return success(res, task, 'Tâche mise à jour');
  } catch (err) {
    return error(res, 'Erreur lors de la mise à jour de la tâche', 500, err.message);
  }
};

exports.remove = async (req, res) => {
  try {
    const checklist = await db.Checklist.findByPk(req.params.id);
    if (!checklist) return notFound(res, 'Checklist introuvable');
    await checklist.destroy();
    return success(res, null, 'Checklist supprimée');
  } catch (err) {
    return error(res, 'Erreur', 500, err.message);
  }
};
