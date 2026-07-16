import { useState } from 'react';
import { BACKEND_URL } from '../../../core/network/config';

export function useVoucher() {
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherError, setVoucherError] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [netAmount, setNetAmount] = useState(null);
  const [isApplying, setIsApplying] = useState(false);

  const applyVoucher = async (code, amount, farmerId) => {
    if (!code.trim()) {
      setVoucherError('Please enter a voucher code.');
      return;
    }

    setIsApplying(true);
    setVoucherError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/vouchers/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          voucherCode: code,
          amount: parseFloat(amount),
          farmerId
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply voucher.');
      }

      setVoucherCode(data.voucherCode);
      setDiscountAmount(parseFloat(data.discountAmount));
      setNetAmount(parseFloat(data.netAmount));
      setVoucherError(null);
      return data;
    } catch (err) {
      setVoucherError(err.message);
      setDiscountAmount(0);
      setNetAmount(null);
      throw err;
    } finally {
      setIsApplying(false);
    }
  };

  const resetVoucher = () => {
    setVoucherCode('');
    setVoucherError(null);
    setDiscountAmount(0);
    setNetAmount(null);
    setIsApplying(false);
  };

  return {
    voucherCode,
    voucherError,
    discountAmount,
    netAmount,
    isApplying,
    applyVoucher,
    resetVoucher,
    setVoucherCode
  };
}
