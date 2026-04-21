const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/dashboard.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/', verifyToken, verifyRole(['dg', 'chef', 'technicien', 'rh']), ctrl.getKPIs);

module.exports = router;
