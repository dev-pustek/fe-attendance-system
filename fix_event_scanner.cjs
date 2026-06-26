const fs = require('fs');
const gateScanPath = 'src/pages/Attendance/Student/GateScan.tsx';
const eventScanPath = 'src/pages/Events/EventScanner.tsx';

let content = fs.readFileSync(gateScanPath, 'utf8');

// 1. Rename Component
content = content.replace(/const GateScan = \(\) => {/g, 'const EventScanner = () => {');
content = content.replace(/export default GateScan;/g, 'export default EventScanner;');

// 2. Insert eventId extraction and validation
const searchParamsIndex = content.indexOf('const [searchParams] = useSearchParams();');
const insertString = `
  const eventId = searchParams.get("eventId");
  useEffect(() => {
    if (!eventId) {
      toast.error("Event ID is missing");
      navigate("/events");
    }
  }, [eventId, navigate]);
`;
content = content.substring(0, searchParamsIndex + 41) + insertString + content.substring(searchParamsIndex + 41);

// 3. Update deviceId
content = content.replace(/const deviceId = isSelfScan \? \`mobile_\$\{user\?\.id\}\` : "gate_kiosk_1";/g, 'const deviceId = isSelfScan ? `mobile_${user?.id}` : `event_scanner_${user?.id || \'kiosk\'}`;');

// 4. Pass eventId to API calls
// scanQRCode
content = content.replace(/photoEvidence: explicitPhoto\n\s*\}\) as any;/g, 'photoEvidence: explicitPhoto,\n          eventId: eventId || undefined\n        }) as any;');

// checkOut
content = content.replace(/method: "MANUAL",\n\s*photo: photoBlob\n\s*\}\);/g, 'method: "MANUAL",\n                photo: photoBlob,\n                eventId: eventId || undefined\n            });');

// checkIn
content = content.replace(/method: "MANUAL",\n\s*photo: photoBlob\n\s*\}\);/g, 'method: "MANUAL",\n                photo: photoBlob,\n                eventId: eventId || undefined\n            });');

// 5. Update UI titles
content = content.replace(/Pustek Attendance/g, 'Event Scanner');
content = content.replace(/Gate Scanner/g, 'Event Scanner');

fs.writeFileSync(eventScanPath, content);
console.log('Done!');
