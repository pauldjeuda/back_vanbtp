const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/checklist.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/',                           verifyToken, verifyRole(['dg', 'chef', 'technicien']), ctrl.getAll);
router.post('/',                           verifyToken, verifyRole(['chef']),                      ctrl.create);
router.put('/:id',                         verifyToken, verifyRole(['chef']),                      ctrl.update);
router.patch('/:id/tasks/:taskId/toggle',  verifyToken, verifyRole(['chef', 'technicien']),        ctrl.toggleTask);
router.delete('/:id',                      verifyToken, verifyRole(['chef']),                      ctrl.remove);

module.exports = router;
