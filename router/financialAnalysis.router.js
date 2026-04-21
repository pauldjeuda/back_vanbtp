const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/financialAnalysis.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/kpis',                      verifyToken, verifyRole(['dg','chef']), ctrl.getAllProjectsKPIs);
router.get('/projects/:id/analysis',     verifyToken, verifyRole(['dg','chef']), ctrl.getProjectAnalysis);
router.post('/transactions/:id/remind',  verifyToken, verifyRole(['dg','chef']), ctrl.sendReminder);
router.get('/accounting',                verifyToken, verifyRole(['dg','chef']), ctrl.getAccountingJournal);
module.exports = router;
