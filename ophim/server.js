const addonInterface = require('./index.js');
const { serveHTTP } = require('stremio-addon-sdk');
serveHTTP(addonInterface, { port: process.env.PORT || 7000 });
