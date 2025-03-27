/**
 * Enhanced Fix for pdf-parse Module Compatibility
 * 
 * This script:
 * 1. Patches the pdf-parse module to prevent startup failures
 * 2. Downloads required PDF.js files if they're missing
 * 3. Sets up the library directory structure
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Path to pdf-parse index.js and lib directory
const pdfParsePath = path.join(__dirname, 'node_modules', 'pdf-parse');
const indexPath = path.join(pdfParsePath, 'index.js');
const libPath = path.join(__dirname, 'lib', 'pdf-parse');

// Function to download a file from URL
function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url} to ${destination}...`);
    
    // Create directory structure if it doesn't exist
    const dir = path.dirname(destination);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const file = fs.createWriteStream(destination);
    https.get(url, response => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Successfully downloaded ${url}`);
        resolve();
      });
    }).on('error', err => {
      fs.unlink(destination, () => {}); // Delete the file if there was an error
      reject(err);
    });
  });
}

// PDF.js versions and files needed
const pdfJsVersions = [
  {
    version: 'v1.10.100',
    files: ['pdf.js', 'pdf.worker.js']
  },
  {
    version: 'v2.0.550',
    files: ['pdf.js', 'pdf.worker.js']
  }
];

// URLs for the PDF.js files
const cdnBase = 'https://cdn.jsdelivr.net/npm/pdfjs-dist';

async function setupPdfJs() {
  try {
    // Create lib directory if it doesn't exist
    if (!fs.existsSync(libPath)) {
      fs.mkdirSync(libPath, { recursive: true });
    }
    
    // Create lib structure
    const pdfJsPath = path.join(libPath, 'lib', 'pdf.js');
    if (!fs.existsSync(pdfJsPath)) {
      fs.mkdirSync(pdfJsPath, { recursive: true });
    }
    
    // Download each version and its files
    for (const { version, files } of pdfJsVersions) {
      const versionPath = path.join(pdfJsPath, version, 'build');
      if (!fs.existsSync(versionPath)) {
        fs.mkdirSync(versionPath, { recursive: true });
      }
      
      // Download each file for this version
      for (const file of files) {
        const fileUrl = `${cdnBase}@${version.substring(1)}/build/${file}`;
        const filePath = path.join(versionPath, file);
        
        if (!fs.existsSync(filePath)) {
          await downloadFile(fileUrl, filePath);
        } else {
          console.log(`File ${filePath} already exists, skipping download`);
        }
      }
    }
    
    console.log('PDF.js files setup complete');
    return true;
  } catch (error) {
    console.error('Error setting up PDF.js files:', error);
    return false;
  }
}

// Fix the pdf-parse index.js file
function fixPdfParseModule() {
  try {
    if (fs.existsSync(indexPath)) {
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
      return true;
    } else {
      console.error('pdf-parse index.js not found, make sure the module is installed');
      return false;
    }
  } catch (error) {
    console.error('Error fixing pdf-parse module:', error);
    return false;
  }
}

// Copy any necessary files from node_modules to lib
function copyRequiredFiles() {
  try {
    // Create the lib/pdf-parse/lib directory if it doesn't exist
    const pdfParseLibPath = path.join(libPath, 'lib');
    if (!fs.existsSync(pdfParseLibPath)) {
      fs.mkdirSync(pdfParseLibPath, { recursive: true });
    }
    
    // Copy the pdf-parse.js file from node_modules if it exists
    const srcPdfParsePath = path.join(pdfParsePath, 'lib', 'pdf-parse.js');
    const destPdfParsePath = path.join(pdfParseLibPath, 'pdf-parse.js');
    
    if (fs.existsSync(srcPdfParsePath) && !fs.existsSync(destPdfParsePath)) {
      fs.copyFileSync(srcPdfParsePath, destPdfParsePath);
      console.log('Copied pdf-parse.js to lib directory');
    }
    
    return true;
  } catch (error) {
    console.error('Error copying required files:', error);
    return false;
  }
}

// Main execution
async function main() {
  console.log('Starting pdf-parse setup and fix...');
  
  // Check if pdf-parse is installed, if not install it
  if (!fs.existsSync(pdfParsePath)) {
    console.log('pdf-parse not found, installing...');
    try {
      execSync('npm install pdf-parse@1.1.1', { stdio: 'inherit' });
    } catch (error) {
      console.error('Failed to install pdf-parse:', error);
      process.exit(1);
    }
  }
  
  // Run all setup functions
  await setupPdfJs();
  fixPdfParseModule();
  copyRequiredFiles();
  
  console.log('pdf-parse setup complete!');
}

main().catch(console.error);