import React from 'react';
import { Modal, TouchableOpacity, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import styles from '../styles/khataTabStyles';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthsHindi = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];

export default function DatePickerModal({
  visible,
  lang,
  pickerDay,
  pickerMonth,
  pickerYear,
  adjustDay,
  adjustMonth,
  adjustYear,
  onCancel,
  onConfirm
}) {
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
            {lang === 'en' ? 'Select Payment Date' : 'भुगतान तिथि चुनें'}
          </Text>

          <View style={styles.datePickerSelectorsRow}>
            {/* Day Column */}
            <View style={styles.datePickerCol}>
              <TouchableOpacity onPress={() => adjustDay(1)} style={styles.datePickerArrow}>
                <Feather name="chevron-up" size={20} color="#1E4032" />
              </TouchableOpacity>
              <Text style={styles.datePickerVal}>{pickerDay.toString().padStart(2, '0')}</Text>
              <Text style={styles.datePickerColLabel}>{lang === 'en' ? 'Day' : 'दिन'}</Text>
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
                {lang === 'en' ? months[pickerMonth] : monthsHindi[pickerMonth]}
              </Text>
              <Text style={styles.datePickerColLabel}>{lang === 'en' ? 'Month' : 'महीना'}</Text>
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
              <Text style={styles.datePickerColLabel}>{lang === 'en' ? 'Year' : 'वर्ष'}</Text>
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
              <Text style={styles.datePickerCancelText}>{lang === 'en' ? 'Cancel' : 'रद्द करें'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.datePickerConfirmBtn}
              onPress={onConfirm}
            >
              <Text style={styles.datePickerConfirmText}>{lang === 'en' ? 'Confirm' : 'पुष्टि करें'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
