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
    const subcontracts = await db.Subcontract.findAll({
      where,
      include: [
        { model: db.SubcontractTask, as: 'tasks' },
        { model: db.Project, as: 'project', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    return success(res, subcontracts);
  } catch (err) {
    return error(res, 'Erreur lors de la récupération des sous-traitances', 500, err.message);
  }
};

exports.create = async (req, res) => {
  try {
    const { entreprise, montant, projectId } = req.body;
    if (!entreprise || !montant || !projectId) {
      return badRequest(res, 'Entreprise, montant et projet sont obligatoires');
    }
    const sub = await db.Subcontract.create(req.body);
    if (req.body.tasks && Array.isArray(req.body.tasks)) {
      await Promise.all(req.body.tasks.map(t =>
        db.SubcontractTask.create({
          title: t.title,
          lotNumber: t.lotNumber || 1,
          lotName: t.lotName || 'Lot 1',
          subcontractId: sub.id,
        })
      ));
    }
    const result = await db.Subcontract.findByPk(sub.id, {
      include: [{ model: db.SubcontractTask, as: 'tasks' }],
    });
    return created(res, result, 'Sous-traitance créée');
  } catch (err) {
    return error(res, 'Erreur lors de la création', 500, err.message);
  }
};

exports.update = async (req, res) => {
  try {
    const sub = await db.Subcontract.findByPk(req.params.id, {
      include: [{ model: db.SubcontractTask, as: 'tasks' }],
    });
    if (!sub) return notFound(res, 'Sous-traitance introuvable');

    // Séparer les champs tasks des autres champs
    const { tasks, ...fields } = req.body;
    await sub.update(fields);

    // Si tasks fourni, synchroniser la liste
    if (Array.isArray(tasks)) {
      const existingTasks = await db.SubcontractTask.findAll({ where: { subcontractId: sub.id } });
      const existingIds = existingTasks.map(t => t.id);
      const incomingIds = tasks.filter(t => t.id).map(t => Number(t.id));

      // 1. Supprimer les tâches absentes du payload
      const toDelete = existingIds.filter(id => !incomingIds.includes(id));
      if (toDelete.length > 0) {
        await db.SubcontractTask.destroy({ where: { id: toDelete, subcontractId: sub.id } });
      }

      // 2. Mettre à jour ou Créer
      for (const t of tasks) {
        const taskData = {
          title: t.title,
          completed: !!t.completed,
          lotNumber: t.lotNumber || 1,
          lotName: t.lotName || 'Lot 1'
        };

        if (t.id && existingIds.includes(Number(t.id))) {
          await db.SubcontractTask.update(taskData, { where: { id: t.id, subcontractId: sub.id } });
        } else if (!t.id) {
          await db.SubcontractTask.create({ ...taskData, subcontractId: sub.id });
        }
      }

      // 3. Recalculer la progression
      const allTasks = await db.SubcontractTask.findAll({ where: { subcontractId: sub.id } });
      const done = allTasks.filter(t => t.completed).length;
      const progress = allTasks.length ? Math.round((done / allTasks.length) * 100) : 0;
      await sub.update({ progress });
    }

    const result = await db.Subcontract.findByPk(sub.id, {
      include: [{ model: db.SubcontractTask, as: 'tasks' }],
    });
    return success(res, result, 'Sous-traitance mise à jour');
  } catch (err) {
    return error(res, 'Erreur lors de la mise à jour', 500, err.message);
  }
};

exports.toggleTask = async (req, res) => {
  try {
    const task = await db.SubcontractTask.findOne({
      where: { id: req.params.taskId, subcontractId: req.params.id },
    });
    if (!task) return notFound(res, 'Tâche introuvable');
    await task.update({ completed: !task.completed });

    // Recalculer la progression
    const allTasks = await db.SubcontractTask.findAll({ where: { subcontractId: req.params.id } });
    const completed = allTasks.filter(t => t.completed).length;
    const progress = allTasks.length ? Math.round((completed / allTasks.length) * 100) : 0;
    await db.Subcontract.update({ progress }, { where: { id: req.params.id } });

    return success(res, { task, progress }, 'Tâche mise à jour');
  } catch (err) {
    return error(res, 'Erreur lors de la mise à jour de la tâche', 500, err.message);
  }
};

exports.remove = async (req, res) => {
  try {
    const sub = await db.Subcontract.findByPk(req.params.id);
    if (!sub) return notFound(res, 'Sous-traitance introuvable');
    await sub.destroy();
    return success(res, null, 'Sous-traitance supprimée');
  } catch (err) {
    return error(res, 'Erreur', 500, err.message);
  }
};
