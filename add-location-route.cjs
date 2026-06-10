const fs = require('fs');
const path = '/Users/m1pro2021/mhmdiamd/work/al-amanah/attendance-system/fe-attendance-system-with-cctv/src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes("LocationSettings")) {
  content = content.replace(
    'import Settings from "./pages/Settings";',
    'import Settings from "./pages/Settings";\nimport LocationSettings from "./pages/Settings/LocationSettings";'
  );
  content = content.replace(
    '<Route path="/settings" element={<Settings />} />',
    '<Route path="/settings" element={<Settings />} />\n              <Route path="/settings/location" element={<LocationSettings />} />'
  );
  fs.writeFileSync(path, content);
  console.log("Added LocationSettings to App.tsx");
} else {
  console.log("LocationSettings already added.");
}
