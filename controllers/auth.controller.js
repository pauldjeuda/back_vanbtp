/**
 * controllers/auth.controller.js
 * Authentification — Login par matricule/mot de passe avec JWT RSA par rôle.
 */
const bcrypt = require('bcryptjs');
const db = require('../models');
const { generateToken } = require('../services/jwt.service');
const { success, unauthorized, badRequest, error } = require('../utils/response');

// Map rôle → modèle Sequelize
const ROLE_MODELS = {
  dg:         db.DG,
  chef:       db.Chef,
  technicien: db.Technicien,
  rh:         db.RH,
};

exports.login = async (req, res) => {
  try {


    const { matricule, password } = req.body || {};

    if (!matricule || !password) {
      return res.status(400).json({
        success: false,
        message: 'Le matricule et le mot de passe sont obligatoires',
        debug: {
          body: req.body ?? null,
          contentType: req.headers['content-type'] || null,
        },
      });
    }

    // Chercher l'utilisateur dans toutes les tables de rôle
    let foundUser = null;
    let foundRole = null;

    for (const [role, Model] of Object.entries(ROLE_MODELS)) {
      try {
        const user = await Model.findOne({ where: { matricule } });
        if (user) { foundUser = user; foundRole = role; break; }
      } catch (e) {
        console.warn(`Recherche dans table ${role} échouée :`, e.message);
      }
    }

    if (!foundUser) {
      return unauthorized(res, 'Matricule ou mot de passe incorrect');
    }

    // Vérifier le mot de passe (bcrypt)
   // Vérifier la présence et la validité du hash
if (!foundUser.motDePasse || typeof foundUser.motDePasse !== 'string') {
  return unauthorized(res, 'Compte invalide ou mot de passe non configuré');
}

// Optionnel : vérifier que ça ressemble à un hash bcrypt
if (!foundUser.motDePasse.startsWith('$2a$') &&
    !foundUser.motDePasse.startsWith('$2b$') &&
    !foundUser.motDePasse.startsWith('$2y$')) {
  return unauthorized(res, 'Mot de passe du compte invalide. Réinitialisation requise.');
}

const isValid = await bcrypt.compare(password, foundUser.motDePasse);
if (!isValid) {
  return unauthorized(res, 'Matricule ou mot de passe incorrect');
}

    // Vérifier que le compte est actif
    if (foundUser.actif === false) {
      return unauthorized(res, 'Compte désactivé — contactez l\'administrateur');
    }

    // Générer le token JWT RSA pour ce rôle
let token;
try {
  token = generateToken(foundUser, foundRole);
} catch (e) {
  console.error('[AUTH] erreur generateToken:', e);
  return error(res, 'Erreur génération token', 500, e.message);
}

    return success(res, {
      token,
      role: foundRole,
      user: {
        id:        foundUser.id,
        matricule: foundUser.matricule,
        nom:       foundUser.nom,
        prenom:    foundUser.prenom,
        email:     foundUser.email,
        photoUrl:  foundUser.photoUrl,
        doitChangerMotDePasse: foundUser.doitChangerMotDePasse,
      },
    }, 'Connexion réussie');

  } catch (err) {
    console.error('[AUTH] login error:', err);
return res.status(500).json({
  success: false,
  message: 'Erreur lors de la connexion',
  details: err.message
});
  }
};

exports.getMe = async (req, res) => {
  try {
    const { id, role } = req.user;
    const Model = ROLE_MODELS[role];
    if (!Model) return badRequest(res, 'Rôle inconnu');

    const user = await Model.findByPk(id, {
      attributes: { exclude: ['motDePasse'] },
    });

    if (!user) return unauthorized(res, 'Utilisateur introuvable');
    return success(res, { user, role });
  } catch (err) {
    return error(res, 'Erreur lors de la récupération du profil', 500, err.message);
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { id, role } = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return badRequest(res, 'Les deux mots de passe sont obligatoires');
    }
    if (newPassword.length < 6) {
      return badRequest(res, 'Le nouveau mot de passe doit faire au moins 6 caractères');
    }

    const Model = ROLE_MODELS[role];
    const user = await Model.findByPk(id);
    if (!user) return unauthorized(res, 'Utilisateur introuvable');

    const isValid = await bcrypt.compare(currentPassword, user.motDePasse);
    if (!isValid) return badRequest(res, 'Mot de passe actuel incorrect');

    const hashed = await bcrypt.hash(newPassword, 12);
    await user.update({ motDePasse: hashed, doitChangerMotDePasse: false });

    return success(res, null, 'Mot de passe modifié avec succès');
  } catch (err) {
    return error(res, 'Erreur lors du changement de mot de passe', 500, err.message);
  }
};
