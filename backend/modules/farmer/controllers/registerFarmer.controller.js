const farmerRepository = require('../farmer.repository');
const { hashMpin } = require('./mpinHelpers');

async function registerFarmer(req, res) {
  const { serial_number, name, state, commodity, phone, fatherName, village, district, tehsil, mpin, coldStorageId } = req.body;
  if (!serial_number || !name) {
    return res.status(400).json({ success: false, error: 'serial_number and name are required fields' });
  }
  if (!coldStorageId) {
    return res.status(400).json({ success: false, error: 'coldStorageId is a required field' });
  }

  try {
    const finalState = state || 'Rajasthan';
    const finalCommodity = commodity || 'Potato';
    const now = new Date();

    const hashedMpin = hashMpin(mpin || '');

    const params = [
      serial_number, 'CS-' + serial_number, name, finalState, finalCommodity, true, 0.0, 10000.0, 0.0, false,
      now, true, now, now, coldStorageId, true, phone || null, fatherName || null,
      village || null, district || null, tehsil || null, hashedMpin
    ];

    await farmerRepository.createFarmerRecord(params);

    try {
      const { logOutboundNotification, createAppNotification } = require('../../../shared/notifications/notifications');
      await logOutboundNotification({
        coldStorageId: coldStorageId, channel: 'SMS', eventType: 'FARMER_REGISTERED',
        recipientPhone: phone || null, recipientName: name,
        message: `Welcome ${name}! Your farmer account at SN Sharma Cold Storage has been registered. Account Number: CS-${serial_number}.`,
        relatedModel: 'Farmer', relatedId: serial_number
      });

      await createAppNotification({
        coldStorageId: coldStorageId, userId: serial_number, type: 'info',
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

module.exports = { registerFarmer };
