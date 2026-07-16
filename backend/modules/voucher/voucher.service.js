const voucherRepository = require('./voucher.repository');

async function validateAndCalculateDiscount(code, farmerId, amount, coldStorageId = null) {
  const voucher = await voucherRepository.getVoucherByCode(code);
  if (!voucher) {
    throw new Error('Voucher code not found.');
  }

  // 1. Validate status
  if (voucher.status !== 'ACTIVE') {
    throw new Error('Voucher is not active.');
  }

  // 2. Validate expiry
  const now = new Date();
  const expiry = new Date(voucher.expiryDate);
  if (now > expiry) {
    throw new Error('Voucher has expired.');
  }

  // 3. Validate usage limit
  const usageLimit = voucher.usageLimit !== null && voucher.usageLimit !== undefined ? parseInt(voucher.usageLimit, 10) : 1;
  const usageCount = voucher.usageCount !== null && voucher.usageCount !== undefined ? parseInt(voucher.usageCount, 10) : 0;
  if (usageCount >= usageLimit) {
    throw new Error('Voucher usage limit has been reached.');
  }

  // 4. Validate minimum order amount
  const parsedAmount = parseFloat(amount || 0);
  const minOrderAmount = parseFloat(voucher.minOrderAmount || 0);
  if (parsedAmount < minOrderAmount) {
    throw new Error(`Order amount is below the minimum required amount of Rs. ${minOrderAmount}.`);
  }

  // Value check: payment amount must be at least the flat voucher value
  const value = parseFloat(voucher.value || 0);
  if ((voucher.type === 'FLAT' || voucher.type === 'CREDIT_NOTE') && parsedAmount < value) {
    throw new Error(`Minimum payment amount of Rs. ${value} is required to use this voucher.`);
  }

  // 5. Validate cold storage specific constraint
  if (voucher.coldStorageId && coldStorageId && voucher.coldStorageId !== coldStorageId) {
    throw new Error('Voucher is not valid for this cold storage.');
  }

  // 6. Validate farmer specific constraint
  if (voucher.farmerId && farmerId && voucher.farmerId !== farmerId) {
    throw new Error('Voucher is not valid for this account.');
  }

  // Calculate discount amount
  let discountAmount = 0;

  if (voucher.type === 'FLAT' || voucher.type === 'CREDIT_NOTE') {
    discountAmount = Math.min(value, parsedAmount);
  } else if (voucher.type === 'PERCENTAGE') {
    const calculated = (value / 100) * parsedAmount;
    if (voucher.maxDiscountAmount) {
      const maxDiscount = parseFloat(voucher.maxDiscountAmount);
      discountAmount = Math.min(calculated, maxDiscount);
    } else {
      discountAmount = calculated;
    }
    discountAmount = Math.min(discountAmount, parsedAmount);
  } else {
    throw new Error('Invalid voucher type.');
  }

  // Round to 2 decimal places
  discountAmount = Math.round(discountAmount * 100) / 100;
  const netAmount = Math.max(0, Math.round((parsedAmount - discountAmount) * 100) / 100);

  return {
    voucher,
    discountAmount,
    netAmount
  };
}

async function redeemVoucherTransaction(code, farmerId, amount, orderId, client) {
  if (!client) {
    throw new Error('Database client transaction is required for voucher redemption.');
  }

  // Lock the row FOR UPDATE
  const voucher = await voucherRepository.getVoucherByCodeForUpdate(code, client);
  if (!voucher) {
    throw new Error('Voucher code not found.');
  }

  // Validate state
  if (voucher.status !== 'ACTIVE') {
    throw new Error('Voucher is not active.');
  }

  const now = new Date();
  const expiry = new Date(voucher.expiryDate);
  if (now > expiry) {
    throw new Error('Voucher has expired.');
  }

  const usageLimit = voucher.usageLimit !== null && voucher.usageLimit !== undefined ? parseInt(voucher.usageLimit, 10) : 1;
  const usageCount = voucher.usageCount !== null && voucher.usageCount !== undefined ? parseInt(voucher.usageCount, 10) : 0;
  if (usageCount >= usageLimit) {
    throw new Error('Voucher usage limit has been reached.');
  }

  const parsedAmount = parseFloat(amount || 0);
  const value = parseFloat(voucher.value || 0);
  if ((voucher.type === 'FLAT' || voucher.type === 'CREDIT_NOTE') && parsedAmount < value) {
    throw new Error(`Minimum payment amount of Rs. ${value} is required to use this voucher.`);
  }
  let discountAmount = 0;

  if (voucher.type === 'FLAT' || voucher.type === 'CREDIT_NOTE') {
    discountAmount = Math.min(value, parsedAmount);
  } else if (voucher.type === 'PERCENTAGE') {
    const calculated = (value / 100) * parsedAmount;
    if (voucher.maxDiscountAmount) {
      const maxDiscount = parseFloat(voucher.maxDiscountAmount);
      discountAmount = Math.min(calculated, maxDiscount);
    } else {
      discountAmount = calculated;
    }
    discountAmount = Math.min(discountAmount, parsedAmount);
  } else {
    throw new Error('Invalid voucher type.');
  }

  discountAmount = Math.round(discountAmount * 100) / 100;

  // Increment usage count in DB
  await voucherRepository.incrementVoucherUsage(code, client);

  // Insert ledger audit log
  await voucherRepository.insertVoucherLedger({
    farmerId,
    voucherCode: code,
    discountApplied: discountAmount,
    orderId
  }, client);

  return discountAmount;
}

module.exports = {
  validateAndCalculateDiscount,
  redeemVoucherTransaction
};
