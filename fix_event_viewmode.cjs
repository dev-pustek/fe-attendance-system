const fs = require('fs');
const eventScanPath = 'src/pages/Events/EventScanner.tsx';
let content = fs.readFileSync(eventScanPath, 'utf8');

// Remove viewMode state
content = content.replace(/const \[viewMode, setViewMode\] = useState<"landing" \| "scanner">\("landing"\);/g, '');

// Remove if (viewMode === "landing") { ... }
const landingStart = content.indexOf('// --- LANDING VIEW ---');
const scannerStart = content.indexOf('// --- SCANNER VIEW ---');
if (landingStart !== -1 && scannerStart !== -1) {
    content = content.substring(0, landingStart) + content.substring(scannerStart);
}

// Remove references to viewMode and setViewMode in SCANNER VIEW
content = content.replace(/\{viewMode === "scanner" \? "Event Scanner" : "Event Scanner"\}/g, '"Event Scanner"');
content = content.replace(/onClick=\{.*?setViewMode\("landing"\).*?\}/g, 'onClick={() => navigate("/events")}');
content = content.replace(/if \(viewMode !== "scanner"\) return;/g, '');
// Also remove it from useEffect dependencies if there is any
content = content.replace(/, viewMode/g, '');

fs.writeFileSync(eventScanPath, content);
console.log('Fixed viewMode!');
