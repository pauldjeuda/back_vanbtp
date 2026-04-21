const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/ticket.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/',       verifyToken, verifyRole(['dg', 'chef', 'technicien', 'rh']), ctrl.getAll);
router.post('/',       verifyToken, verifyRole(['dg', 'chef', 'technicien', 'rh']), ctrl.create);
router.put('/:id',     verifyToken, verifyRole(['dg']),                              ctrl.update);
router.delete('/:id',  verifyToken, verifyRole(['dg']),                              ctrl.remove);

module.exports = router;
