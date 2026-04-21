const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/employee.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/',       verifyToken, verifyRole(['dg', 'chef', 'rh']),  ctrl.getAll);
router.get('/:id',    verifyToken, verifyRole(['dg', 'chef', 'rh']),  ctrl.getById);
router.post('/',      verifyToken, verifyRole(['chef', 'rh']),         ctrl.create);
router.put('/:id',    verifyToken, verifyRole(['chef', 'rh']),         ctrl.update);
router.delete('/:id', verifyToken, verifyRole(['chef', 'rh']),         ctrl.remove);

module.exports = router;
