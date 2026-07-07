import { useState } from 'react';

export function useDatePickerState() {
  const [pickerDay, setPickerDay] = useState(new Date().getDate());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date());

  const adjustDay = (val) => {
    let nextDay = pickerDay + val;
    if (nextDay < 1) nextDay = 31;
    if (nextDay > 31) nextDay = 1;
    setPickerDay(nextDay);
  };

  const adjustMonth = (val) => {
    let nextMonth = pickerMonth + val;
    if (nextMonth < 0) nextMonth = 11;
    if (nextMonth > 11) nextMonth = 0;
    setPickerMonth(nextMonth);
  };

  const adjustYear = (val) => {
    setPickerYear(pickerYear + val);
  };

  const handleConfirmDate = () => {
    const d = new Date(pickerYear, pickerMonth, pickerDay);
    setPaymentDate(d);
    setDatePickerVisible(false);
  };

  return {
    pickerDay, pickerMonth, pickerYear, datePickerVisible, paymentDate,
    setDatePickerVisible, setPickerDay, setPickerMonth, setPickerYear,
    adjustDay, adjustMonth, adjustYear, handleConfirmDate
  };
}
