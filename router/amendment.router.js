const express = require('express');
const router  = express.Router({ mergeParams: true }); // pour accéder à :projectId
const ctrl    = require('../controllers/amendment.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/',           verifyToken, verifyRole(['dg', 'chef']), ctrl.getAll);
router.post('/',          verifyToken, verifyRole(['chef']),        ctrl.create);
router.patch('/:id/status', verifyToken, verifyRole(['dg']),       ctrl.updateStatus);
module.exports = router;
