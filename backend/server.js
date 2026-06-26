const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', require('./routes/mandi'));
app.use('/api', require('./routes/farmers'));
app.use('/api', require('./routes/amad'));
app.use('/api', require('./routes/storages'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'Annsetu Backend' }));

app.listen(PORT, () => {
  console.log(`✅ Annsetu backend running on http://localhost:${PORT}`);
});
