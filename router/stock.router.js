const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/stock.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/',       verifyToken, verifyRole(['dg', 'chef', 'technicien']), ctrl.getAll);
router.post('/',      verifyToken, verifyRole(['chef', 'technicien']),        ctrl.create);
router.delete('/:id', verifyToken, verifyRole(['chef']),                      ctrl.remove);

module.exports = router;
