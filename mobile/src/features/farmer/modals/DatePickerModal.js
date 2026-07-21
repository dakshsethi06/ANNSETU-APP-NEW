import React from 'react';
import { Modal, TouchableOpacity, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import styles from '../styles/khataTabStyles';

export default function DatePickerModal({
  visible,
  pickerDay,
  pickerMonth,
  pickerYear,
  adjustDay,
  adjustMonth,
  adjustYear,
  onCancel,
  onConfirm
}) {
  const { t } = useTranslation();

  const months = [
    t('months.jan'),
    t('months.feb'),
    t('months.mar'),
    t('months.apr'),
    t('months.may'),
    t('months.jun'),
    t('months.jul'),
    t('months.aug'),
    t('months.sep'),
    t('months.oct'),
    t('months.nov'),
    t('months.dec')
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <View style={styles.datePickerContainer} onStartShouldSetResponder={() => true}>
          <Text style={styles.datePickerTitle}>
            {t('khata.select_payment_date')}
          </Text>

          <View style={styles.datePickerSelectorsRow}>
            {/* Day Column */}
            <View style={styles.datePickerCol}>
              <TouchableOpacity onPress={() => adjustDay(1)} style={styles.datePickerArrow}>
                <Feather name="chevron-up" size={20} color="#1E4032" />
              </TouchableOpacity>
              <Text style={styles.datePickerVal}>{pickerDay.toString().padStart(2, '0')}</Text>
              <Text style={styles.datePickerColLabel}>{t('khata.day')}</Text>
              <TouchableOpacity onPress={() => adjustDay(-1)} style={styles.datePickerArrow}>
                <Feather name="chevron-down" size={20} color="#1E4032" />
              </TouchableOpacity>
            </View>

            {/* Month Column */}
            <View style={styles.datePickerCol}>
              <TouchableOpacity onPress={() => adjustMonth(1)} style={styles.datePickerArrow}>
                <Feather name="chevron-up" size={20} color="#1E4032" />
              </TouchableOpacity>
              <Text style={styles.datePickerVal}>
                {months[pickerMonth]}
              </Text>
              <Text style={styles.datePickerColLabel}>{t('khata.month')}</Text>
              <TouchableOpacity onPress={() => adjustMonth(-1)} style={styles.datePickerArrow}>
                <Feather name="chevron-down" size={20} color="#1E4032" />
              </TouchableOpacity>
            </View>

            {/* Year Column */}
            <View style={styles.datePickerCol}>
              <TouchableOpacity onPress={() => adjustYear(1)} style={styles.datePickerArrow}>
                <Feather name="chevron-up" size={20} color="#1E4032" />
              </TouchableOpacity>
              <Text style={styles.datePickerVal}>{pickerYear}</Text>
              <Text style={styles.datePickerColLabel}>{t('khata.year')}</Text>
              <TouchableOpacity onPress={() => adjustYear(-1)} style={styles.datePickerArrow}>
                <Feather name="chevron-down" size={20} color="#1E4032" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.datePickerActions}>
            <TouchableOpacity
              style={styles.datePickerCancelBtn}
              onPress={onCancel}
            >
              <Text style={styles.datePickerCancelText}>{t('khata.cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.datePickerConfirmBtn}
              onPress={onConfirm}
            >
              <Text style={styles.datePickerConfirmText}>{t('khata.confirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
