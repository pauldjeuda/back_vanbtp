/**
 * utils/generateKeys.js
 * Génère les paires de clés RSA-2048 pour chaque rôle VAN BTP.
 * Usage : npm run generate-keys
 * Inspiré de backend_rh/utils/generateKeys.js
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const roles = ['dg', 'chef', 'technicien', 'rh'];

roles.forEach(role => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const dir = path.join(__dirname, '../.private', role);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(path.join(dir, 'public.pem'),  publicKey);
  fs.writeFileSync(path.join(dir, 'private.pem'), privateKey);
  console.log(`✓ Clés RSA générées pour le rôle : ${role}`);
});

console.log('\nToutes les clés ont été générées dans .private/');
