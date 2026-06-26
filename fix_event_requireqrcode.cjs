const fs = require('fs');
const eventScanPath = 'src/pages/Events/EventScanner.tsx';
let content = fs.readFileSync(eventScanPath, 'utf8');

// Replace the useMemo definition of requireQrCode with a constant true
content = content.replace(/const requireQrCode = useMemo\(\(\) => \{[\s\S]*?return false;\n  \}, \[userPolicy\?\.rules, globalRulesResponse\?\.data\]\);/g, 'const requireQrCode = true;');

fs.writeFileSync(eventScanPath, content);
console.log('Fixed requireQrCode!');
