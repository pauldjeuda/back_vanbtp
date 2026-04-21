const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/auth.controller');
const verifyToken = require('../middlewares/verifyToken');

router.post('/login',            ctrl.login);
router.get('/me',   verifyToken, ctrl.getMe);
router.put('/password', verifyToken, ctrl.changePassword);

module.exports = router;
