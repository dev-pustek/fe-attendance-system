const fs = require('fs');
const eventScanPath = 'src/pages/Events/EventScanner.tsx';
let content = fs.readFileSync(eventScanPath, 'utf8');
content = content.replace(/\.\.\/\.\.\/\.\.\//g, '../../');
fs.writeFileSync(eventScanPath, content);
console.log('Fixed imports!');
