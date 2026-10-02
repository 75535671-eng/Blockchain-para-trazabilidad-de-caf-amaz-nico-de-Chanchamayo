const servidor = require('../backend/dist/infrastructure/http/vercel.js');

module.exports = servidor.default || servidor;
module.exports.maxDuration = 30;
