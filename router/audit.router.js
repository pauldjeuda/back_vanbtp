const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/audit.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/',       verifyToken, verifyRole(['dg', 'chef']), ctrl.getAll);
router.post('/',       verifyToken, verifyRole(['chef']),        ctrl.create);
router.put('/:id',     verifyToken, verifyRole(['dg', 'chef']), ctrl.update);
router.delete('/:id',  verifyToken, verifyRole(['chef']),        ctrl.remove);

module.exports = router;
