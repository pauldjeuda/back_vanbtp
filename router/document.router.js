const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/document.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');
const upload      = require('../services/upload.service');

const setDocumentFolder = (req, _res, next) => {
  req.uploadFolder = 'documents';
  next();
};

// Middleware qui accepte aussi le token en query param (pour les téléchargements directs)
const verifyTokenOrQuery = (req, res, next) => {
  if (!req.headers['authorization'] && req.query.token) {
    req.headers['authorization'] = `Bearer ${req.query.token}`;
  }
  return verifyToken(req, res, next);
};

router.get('/',
  verifyToken, verifyRole(['dg', 'chef', 'technicien', 'rh']), ctrl.getAll);

router.post('/',
  verifyToken, verifyRole(['chef', 'technicien']),
  setDocumentFolder, upload.single('file'), ctrl.upload);

router.get('/:id/download',
  verifyTokenOrQuery, verifyRole(['dg', 'chef', 'technicien', 'rh']), ctrl.download);

router.delete('/:id',
  verifyToken, verifyRole(['chef']), ctrl.remove);

module.exports = router;
