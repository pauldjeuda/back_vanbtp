/**
 * middlewares/verifyToken.js
 * Vérifie le JWT avec la clé publique RSA du rôle de l'utilisateur.
 * Pattern identique à backend_rh/middlewares/verifyToken.js
 */
const { verifyToken: jwtVerify, decodeToken } = require('../services/jwt.service');
const { unauthorized, error } = require('../utils/response');

const verifyToken = (req, res, next) => {
  // Extraire le token du header Authorization
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'Accès non autorisé — token manquant');
  }

  const token = authHeader.split(' ')[1];

  try {
    // Décoder d'abord sans vérification pour extraire le rôle
    const decoded = decodeToken(token);
    if (!decoded || !decoded.role) {
      return unauthorized(res, 'Token malformé — rôle introuvable');
    }

    const role = decoded.role.toLowerCase();

    // Vérifier avec la clé publique du rôle
    const verified = jwtVerify(token, role);

    req.user = verified;
    req.role = role;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Session expirée — veuillez vous reconnecter');
    }
    if (err.name === 'JsonWebTokenError') {
      return unauthorized(res, 'Token invalide');
    }
    return error(res, 'Erreur de vérification du token', 500, err.message);
  }
};

module.exports = verifyToken;
