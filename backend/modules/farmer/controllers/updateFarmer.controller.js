const farmerRepository = require('../farmer.repository');
const farmerConstants = require('../farmer.constants');

async function updateFarmer(req, res) {
  const { id } = req.params;
  
  // Ensure the user is only updating their own profile
  if (req.user && String(req.user.id) !== String(id)) {
    return res.status(403).json({ success: false, error: 'Forbidden: Cannot update another user\'s profile.' });
  }

  const { name, phone, email, aadhaarNumber, panNumber } = req.body;

  try {
    const current = await farmerRepository.getFarmerBasicDetails(id);
    if (!current) {
      return res.status(404).json({ success: false, error: farmerConstants.ERROR_MESSAGES.FARMER_NOT_FOUND });
    }

    const finalName = name !== undefined ? name : current.name;
    const finalPhone = phone !== undefined ? phone : current.phone;
    const finalEmail = email !== undefined ? email : current.email;
    const finalAadhaar = aadhaarNumber !== undefined ? aadhaarNumber : current.aadhaarNumber;
    const finalPan = panNumber !== undefined ? panNumber : current.panNumber;

    const farmer = await farmerRepository.updateFarmerBasicDetails(
      id, finalName, finalPhone, finalEmail, finalAadhaar, finalPan
    );

    return res.json({ success: true, farmer: farmer });
  } catch (error) {
    console.error('PostgreSQL updateFarmer error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update farmer profile.' });
  }
}

module.exports = { updateFarmer };
