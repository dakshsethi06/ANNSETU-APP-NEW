const { getFarmersData } = require('./repositories/getFarmersData.repository');
const { createFarmerRecord } = require('./repositories/createFarmerRecord.repository');
const { getFarmerByPhone } = require('./repositories/getFarmerByPhone.repository');
const { getFarmerLedger } = require('./repositories/getFarmerLedger.repository');

module.exports = {
  getFarmersData,
  createFarmerRecord,
  getFarmerByPhone,
  getFarmerLedger
};
