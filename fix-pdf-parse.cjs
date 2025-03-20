const fs = require('fs');
const path = require('path');

// Path to pdf-parse index.js
const indexPath = path.join(__dirname, 'node_modules', 'pdf-parse', 'index.js');

// Read the original file
const originalContent = fs.readFileSync(indexPath, 'utf8');

// Create a new version that just exports the module without testing
const newContent = `
'use strict';
const Pdf = require('./lib/pdf-parse.js');
module.exports = Pdf;
`;

// Write the fixed version
fs.writeFileSync(indexPath, newContent);
console.log('Successfully fixed pdf-parse module');