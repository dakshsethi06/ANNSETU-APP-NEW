const userRoleService = require('./user-role.service');

async function getUserRole(req, res) {
  try {
    const { phone } = req.query;
    const role = await userRoleService.determineUserRole(phone);
    return res.json({ success: true, role });
  } catch (error) {
    console.error('Error fetching user-role:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = { getUserRole };
