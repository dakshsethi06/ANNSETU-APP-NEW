const ExcelJS = require('exceljs');
const path = require('path');

const workbook = new ExcelJS.Workbook();
const ws = workbook.addWorksheet('Annsetu IoT Spec');

// Column widths
ws.columns = [
  { key: 'section', width: 28 },
  { key: 'task', width: 52 },
  { key: 'priority', width: 12 },
  { key: 'status', width: 14 },
];

// Header row
const headerRow = ws.addRow(['Section', 'Task', 'Priority', 'Status']);
headerRow.eachCell(cell => {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E5C2E' } };
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = { bottom: { style: 'thin', color: { argb: 'FFB0C8B4' } } };
});
ws.getRow(1).height = 22;

const sections = [
  {
    name: '1. Cloud Architecture & API',
    color: 'FFE8F5E9',
    tasks: [
      ['API Gateway: route & secure incoming traffic', 'High'],
      ['Auth Service: JWT sessions + password hashing', 'High'],
      ['Telemetry Service: ingest via HTTPS + MQTT', 'High'],
      ['Packet Parsing: 10 types (HEARTBEAT, SENSOR_DATA, BATTERY, ALERT, OTA_REQUEST, OTA_DATA, OTA_COMPLETE, ACK, ERROR, DEVICE_STATUS)', 'High'],
      ['Disaster Recovery: bulk upload on reconnect', 'High'],
      ['Device Management Service: registration & state', 'Medium'],
      ['OTA & Notification Services: firmware + alerts', 'Medium'],
    ],
  },
  {
    name: '2. Database Schema',
    color: 'FFF1F8E9',
    tasks: [
      ['Relational hierarchy: Facility → Chamber → Controller → Child', 'High'],
      ['Device Registry: ID, Serial, FW, HW, Chamber, CS, Date, MAC, Status', 'High'],
      ['5-year retention: temp, humidity, RSSI, battery, alerts, status logs', 'High'],
    ],
  },
  {
    name: '3. Web Dashboard UI/UX',
    color: 'FFE8F5E9',
    tasks: [
      ['Home: Total CS, Chambers, Online/Offline, Alerts, Avg Temp/Humidity, Cloud Status, Last Sync', 'High'],
      ['Cold Storage view: name, chambers, devices, alerts, network & device health, temp summary', 'High'],
      ['Chamber view: temp, humidity, battery, RSSI, comms status, last updated, FW, health', 'High'],
      ['Device view: ID, MAC, FW, battery, RSSI, packet loss, temp/humidity, heartbeat, install date', 'High'],
      ['Charts: Temp, Humidity, Battery, RSSI, Comms Health, Alert Frequency trends', 'Medium'],
      ['Chart filters: Hourly, Daily, Weekly, Monthly, Yearly', 'Medium'],
      ['Reports: Daily/Weekly/Monthly/Alert/Device/Comms/Temp/Battery → PDF, Excel, CSV', 'Medium'],
      ['5-second auto refresh on all dashboards', 'High'],
    ],
  },
  {
    name: '4. Alert & Notifications',
    color: 'FFF1F8E9',
    tasks: [
      ['Triggers: High/Low Temp, High/Low Humidity, Offline, Sensor Fail, Comms Fail, OTA Fail, Low Battery', 'High'],
      ['Priority levels: Critical, High, Medium, Low', 'High'],
      ['Channels: Push, SMS, WhatsApp, Email, In-app', 'High'],
      ['Payload: Timestamp, Device, Chamber, Temp, Alert Type, Severity', 'Medium'],
    ],
  },
  {
    name: '5. Device Command & OTA',
    color: 'FFE8F5E9',
    tasks: [
      ['Config tools: thresholds, sampling, heartbeat, delay, OTA schedule, timezone', 'Medium'],
      ['Device workflows: Register, Replace, Remove, Assign, Change FW, Restart, Logs, Config', 'High'],
      ['OTA Dashboard: current/available version, progress, success rate, failed devices', 'Medium'],
      ['OTA scopes: Single, Chamber, Cold Storage, Bulk', 'Medium'],
    ],
  },
  {
    name: '6. Mobile App',
    color: 'FFF1F8E9',
    tasks: [
      ['Core: Live Monitoring, Device Health, Temp/Humidity Graphs, Battery, Offline Alerts', 'High'],
      ['Mobile actions: Push Notifications, OTA progress, Device Restart (authorized only)', 'Medium'],
    ],
  },
  {
    name: '7. Security & RBAC',
    color: 'FFE8F5E9',
    tasks: [
      ['Security: HTTPS, JWT, hashed passwords, unique device auth keys', 'High'],
      ['Audit log: Login, Logout, Config changes, OTA, Alerts, Device assign, User changes (5yr)', 'High'],
      ['Roles: Super Admin, Company Admin, CS Owner, Operator, Technician', 'High'],
    ],
  },
  {
    name: '8. Performance SLAs',
    color: 'FFF1F8E9',
    tasks: [
      ['Scale: 10k CS, 100k Chambers, 500k Devices, millions of daily telemetry records', 'High'],
      ['Dashboard load < 3s, API response < 500ms', 'High'],
      ['Device registration < 10s, Alert generation < 5s', 'High'],
      ['Notification delivery < 30s, OTA dispatch < 15s', 'Medium'],
    ],
  },
  {
    name: '9. Future Roadmap',
    color: 'FFE8F5E9',
    tasks: [
      ['AI anomaly detection & predictive maintenance', 'Low'],
      ['Compressor efficiency & energy analytics', 'Low'],
      ['CO₂ / NH₃ monitoring & door-open analytics', 'Low'],
      ['Automatic hardware calibration reminders', 'Low'],
      ['Digital twin visualization of facilities', 'Low'],
      ['Multi-site benchmarking reports', 'Low'],
    ],
  },
];

const priorityColors = {
  High: 'FFFF5252',
  Medium: 'FFFFA726',
  Low: 'FF66BB6A',
};

for (const section of sections) {
  for (const [task, priority] of section.tasks) {
    const row = ws.addRow([section.name, task, priority, 'To Do']);
    row.height = 18;

    // Section cell
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: section.color } };
    row.getCell(1).font = { bold: true, size: 9, color: { argb: 'FF1E5C2E' } };
    row.getCell(1).alignment = { vertical: 'middle', wrapText: false };

    // Task cell
    row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    row.getCell(2).font = { size: 9 };
    row.getCell(2).alignment = { vertical: 'middle', wrapText: true };

    // Priority badge
    const pCell = row.getCell(3);
    pCell.value = priority;
    pCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: priorityColors[priority] } };
    pCell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    pCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Status
    const sCell = row.getCell(4);
    sCell.value = 'To Do';
    sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
    sCell.font = { size: 9, color: { argb: 'FF757575' } };
    sCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Thin border bottom
    row.eachCell(cell => {
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFDDDDDD' } } };
    });
  }
}

// Freeze header
ws.views = [{ state: 'frozen', ySplit: 1 }];

// Auto filter
ws.autoFilter = { from: 'A1', to: 'D1' };

const outPath = path.join('C:\\Users\\tejas\\AnnsetuNewApp\\to do lists', 'Annsetu_IoT_ToDo.xlsx');
workbook.xlsx.writeFile(outPath).then(() => {
  console.log('Excel file created at:', outPath);
}).catch(err => console.error(err));
