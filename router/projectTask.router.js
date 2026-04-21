const express = require('express');
const router  = express.Router({ mergeParams: true });
const ctrl    = require('../controllers/projectTask.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/',               verifyToken, verifyRole(['dg','chef','technicien']), ctrl.getAll);
router.post('/',              verifyToken, verifyRole(['chef']),                   ctrl.create);
router.put('/:taskId',        verifyToken, verifyRole(['dg','chef']),              ctrl.update);
router.patch('/:taskId/status', verifyToken, verifyRole(['dg','chef','technicien']), ctrl.updateStatus);
router.delete('/:taskId',     verifyToken, verifyRole(['chef']),                   ctrl.remove);
module.exports = router;
