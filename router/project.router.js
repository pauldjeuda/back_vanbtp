const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/project.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/',     verifyToken, verifyRole(['dg', 'chef', 'technicien', 'rh']), ctrl.getAll);
router.get('/:id',  verifyToken, verifyRole(['dg', 'chef', 'technicien']),       ctrl.getById);
router.post('/',    verifyToken, verifyRole(['chef']),                            ctrl.create);
router.put('/:id',  verifyToken, verifyRole(['dg', 'chef']),                     ctrl.update);
router.delete('/:id', verifyToken, verifyRole(['dg', 'chef']),                   ctrl.remove);

module.exports = router;
