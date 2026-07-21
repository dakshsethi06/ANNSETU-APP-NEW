const express = require('express');
const router = express.Router();
const { dispatchCommand } = require('./command.dispatcher');

// POST /api/commands/dispatch
router.post('/dispatch', async (req, res) => {
  try {
    const { deviceId, payload } = req.body;
    
    if (!deviceId || !payload) {
      return res.status(400).json({ error: 'deviceId and payload are required' });
    }

    await dispatchCommand(deviceId, payload);
    
    res.json({ success: true, message: `Command dispatched to ${deviceId}` });
  } catch (error) {
    console.error('[Command Route] Error dispatching command:', error);
    res.status(500).json({ error: 'Failed to dispatch command' });
  }
});

module.exports = router;
