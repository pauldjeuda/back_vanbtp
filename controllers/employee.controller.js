const db = require('../models');
const { success, created, notFound, error, badRequest } = require('../utils/response');

exports.getAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.projectId) where.projectId = req.query.projectId;
    if (req.role === 'rh') {
      // RH voit tout le personnel
    } else if (req.role === 'chef') {
      const projects = await db.Project.findAll({ where: { chefId: req.user.id }, attributes: ['id'] });
      where.projectId = projects.map(p => p.id);
    }
    const employees = await db.Employee.findAll({
      where,
      include: [{ model: db.Project, as: 'currentProject', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']],
    });
    return success(res, employees);
  } catch (err) {
    return error(res, 'Erreur lors de la récupération du personnel', 500, err.message);
  }
};

exports.getById = async (req, res) => {
  try {
    const emp = await db.Employee.findByPk(req.params.id, {
      include: [
        { model: db.Project, as: 'currentProject', attributes: ['id', 'name'] },
        { model: db.EmployeeAssignment, as: 'assignments', include: [{ model: db.Project, as: 'project', attributes: ['id', 'name'] }] },
      ],
    });
    if (!emp) return notFound(res, 'Employé introuvable');
    return success(res, emp);
  } catch (err) {
    return error(res, 'Erreur', 500, err.message);
  }
};

exports.create = async (req, res) => {
  try {
    const { matricule, name, role, contract, projectId } = req.body;
    if (!matricule || !name || !role) {
      return badRequest(res, 'Matricule, nom et rôle sont obligatoires');
    }
    const employee = await db.Employee.create({ matricule, name, role, contract, projectId, ...req.body });
    if (projectId) {
      await db.EmployeeAssignment.create({
        employeeId: employee.id, projectId, startDate: new Date(),
      });
    }
    await db.Log.create({
      action: `Ajout de l'employé : ${name}`,
      module: 'Ressources', entityType: 'Employee', entityId: employee.id,
      userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
    });
    return created(res, employee, 'Employé créé avec succès');
  } catch (err) {
    return error(res, 'Erreur lors de la création', 500, err.message);
  }
};

exports.update = async (req, res) => {
  try {
    const emp = await db.Employee.findByPk(req.params.id);
    if (!emp) return notFound(res, 'Employé introuvable');
    const oldProjectId = emp.projectId;
    await emp.update(req.body);
    // Tracer le changement d'affectation
    if (req.body.projectId && req.body.projectId !== oldProjectId) {
      await db.EmployeeAssignment.create({
        employeeId: emp.id, projectId: req.body.projectId, startDate: new Date(),
      });
    }
    return success(res, emp, 'Employé mis à jour');
  } catch (err) {
    return error(res, 'Erreur lors de la mise à jour', 500, err.message);
  }
};

exports.remove = async (req, res) => {
  try {
    const emp = await db.Employee.findByPk(req.params.id);
    if (!emp) return notFound(res, 'Employé introuvable');
    await emp.destroy();
    return success(res, null, 'Employé supprimé');
  } catch (err) {
    return error(res, 'Erreur lors de la suppression', 500, err.message);
  }
};
