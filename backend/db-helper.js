const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'mock-db.json');

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return { farmers: [] };
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data || '{}');
  } catch (err) {
    console.error('Failed to read mock database:', err);
    return { farmers: [] };
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to write mock database:', err);
    return false;
  }
}

module.exports = {
  readDb,
  writeDb
};
