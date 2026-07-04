const userRoleRepository = require('./user-role.repository');

async function determineUserRole(phone) {
  const cleanPhone = phone.replace('+91', '').trim();

  const hasCsRole = await userRoleRepository.checkColdStorageOnboarding(cleanPhone);
  if (hasCsRole) return 'ColdStorageFacility';

  const hasFarmerRole = await userRoleRepository.checkFarmer(cleanPhone);
  if (hasFarmerRole) return 'ColdStorage';

  return 'ColdStorage';
}

module.exports = { determineUserRole };
