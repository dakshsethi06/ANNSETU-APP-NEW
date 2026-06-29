const farmerRepository = require('../repositories/farmerRepository');

async function getFarmers(req, res) {
  try {
    const { state, serial_number } = req.query;
    const farmers = await farmerRepository.getFarmersData(state, serial_number);
    return res.json({ success: true, farmers });
  } catch (error) {
    console.error('PostgreSQL farmers GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch farmers from database' });
  }
}

async function registerFarmer(req, res) {
  const { serial_number, name, state, commodity, phone, fatherName, village, district, tehsil } = req.body;
  if (!serial_number || !name) {
    return res.status(400).json({ success: false, error: 'serial_number and name are required fields' });
  }

  try {
    const finalState = state || 'Rajasthan';
    const finalCommodity = commodity || 'Potato';
    const now = new Date();
    
    const params = [
      serial_number, 'CS-' + serial_number, name, finalState, finalCommodity, true, 0.0, 10000.0, 0.0, false,
      now, true, now, now, 'cmmp9txv0000ai3t4wush9trs', true, phone || null, fatherName || null,
      village || null, district || null, tehsil || null
    ];
    
    await farmerRepository.createFarmerRecord(params);
    
    try {
      const { logOutboundNotification, createAppNotification } = require('../lib/notifications');
      await logOutboundNotification({
        coldStorageId: 'cmmp9txv0000ai3t4wush9trs', channel: 'SMS', eventType: 'FARMER_REGISTERED',
        recipientPhone: phone || null, recipientName: name,
        message: `Welcome ${name}! Your farmer account at SN Sharma Cold Storage has been registered. Account Number: CS-${serial_number}.`,
        relatedModel: 'Farmer', relatedId: serial_number
      });

      await createAppNotification({
        coldStorageId: 'cmmp9txv0000ai3t4wush9trs', userId: serial_number, type: 'info',
        title: 'Welcome to Annsetu', message: `Welcome ${name}! Your account has been registered successfully.`, icon: 'info'
      });
    } catch (notifErr) { console.warn('Welcome notifications failed to trigger:', notifErr.message); }
    
    return res.status(201).json({
      success: true,
      farmer: { serial_number, name, state: finalState, commodity: finalCommodity, phone: phone || null, fatherName: fatherName || null, village: village || null, district: district || null, tehsil: tehsil || null }
    });
  } catch (error) {
    console.error('PostgreSQL farmers POST error:', error.message);
    if (error.code === '23505') { return res.status(400).json({ success: false, error: `Farmer with serial number ${serial_number} already exists` }); }
    return res.status(500).json({ success: false, error: error.message || 'Failed to register farmer in database' });
  }
}

module.exports = { getFarmers, registerFarmer };
