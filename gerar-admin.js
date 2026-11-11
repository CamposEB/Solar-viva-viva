const crypto = require('crypto');
const salt = crypto.randomBytes(16);
const hash = crypto.pbkdf2Sync('admin', salt, 100000, 32, 'sha256');
const sql = `UPDATE admins SET senha_hash = 'pbkdf2$100000$${salt.toString('hex')}$${hash.toString('hex')}' WHERE usuario = 'admin';`;
console.log("--- COPIE A LINHA ABAIXO E RODE NO CONSOLE DO D1 ---");
console.log(sql);