const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/purchase.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/',                  verifyToken, verifyRole(['dg', 'chef']), ctrl.getAll);
router.get('/:id',               verifyToken, verifyRole(['dg', 'chef']), ctrl.getById);
router.post('/',                  verifyToken, verifyRole(['chef']),        ctrl.create);
router.patch('/:id/status',       verifyToken, verifyRole(['dg', 'chef']), ctrl.updateStatus);
router.delete('/:id',             verifyToken, verifyRole(['chef']),        ctrl.remove);

module.exports = router;
