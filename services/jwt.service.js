/**
 * services/jwt.service.js
 * Gestion des tokens JWT avec clés RSA-2048 par rôle.
 * Pattern identique à backend_rh/utils/jwt.js — une paire de clés par rôle.
 */
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

const getKeys = (role) => {
  const dir = path.join(__dirname, '../.private', role.toLowerCase());
  const privatePath = path.join(dir, 'private.pem');
  const publicPath  = path.join(dir, 'public.pem');

  if (!fs.existsSync(privatePath) || !fs.existsSync(publicPath)) {
    throw new Error(
      `Clés RSA introuvables pour le rôle "${role}". Exécutez : npm run generate-keys`
    );
  }

  return {
    privateKey: fs.readFileSync(privatePath, 'utf8'),
    publicKey:  fs.readFileSync(publicPath,  'utf8'),
  };
};

/**
 * Génère un token JWT signé avec la clé privée du rôle.
 */
const generateToken = (user, role) => {
  const { privateKey } = getKeys(role);
  return jwt.sign(
    { id: user.id, matricule: user.matricule, role, nom: user.nom, prenom: user.prenom },
    privateKey,
    { algorithm: 'RS256', expiresIn: EXPIRES_IN }
  );
};

/**
 * Vérifie et décode un token JWT avec la clé publique du rôle.
 */
const verifyToken = (token, role) => {
  const { publicKey } = getKeys(role);
  return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
};

/**
 * Décode un token sans vérification (pour extraire le rôle avant vérification).
 */
const decodeToken = (token) => {
  try { return jwt.decode(token); }
  catch { return null; }
};

module.exports = { generateToken, verifyToken, decodeToken };
