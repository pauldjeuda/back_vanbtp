const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/attendance.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/',                      verifyToken, verifyRole(['dg', 'chef', 'rh']),  ctrl.getAll);
router.post('/bulk',                 verifyToken, verifyRole(['chef']),               ctrl.bulkCreate);
router.get('/employee/:employeeId',  verifyToken, verifyRole(['dg', 'chef', 'rh']),  ctrl.getHistory);
module.exports = router;
