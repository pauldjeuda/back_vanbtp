const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/debt.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/',             verifyToken, verifyRole(['dg', 'chef']), ctrl.getAll);
router.post('/:id/repayments', verifyToken, verifyRole(['dg', 'chef']), ctrl.addRepayment);
module.exports = router;
