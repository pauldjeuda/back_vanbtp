const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/production.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/dashboard',   verifyToken, verifyRole(['dg', 'chef']), ctrl.getDashboard);
router.get('/entries',     verifyToken, verifyRole(['dg', 'chef']), ctrl.getAllEntries);
router.post('/entries',    verifyToken, verifyRole(['dg', 'chef']), ctrl.createEntry);
router.delete('/entries/:id', verifyToken, verifyRole(['dg', 'chef']), ctrl.deleteEntry);
router.get('/sales',       verifyToken, verifyRole(['dg', 'chef']), ctrl.getAllSales);
router.post('/sales',      verifyToken, verifyRole(['dg', 'chef']), ctrl.createSale);
router.delete('/sales/:id',verifyToken, verifyRole(['dg', 'chef']), ctrl.deleteSale);
module.exports = router;
