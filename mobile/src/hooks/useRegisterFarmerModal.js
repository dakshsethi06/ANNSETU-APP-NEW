import { useState } from 'react';
import { Alert } from 'react-native';
import { addFarmer } from '../services/api';

export function useRegisterFarmerModal(onClose, onRegisterSuccess) {
  const [newFarmerName, setNewFarmerName] = useState('');
  const [newFarmerId, setNewFarmerId] = useState('');
  const [newFarmerState, setNewFarmerState] = useState('Rajasthan');
  const [newFarmerCrop, setNewFarmerCrop] = useState('Potato');
  const [newFarmerPhone, setNewFarmerPhone] = useState('');
  const [newFarmerFatherName, setNewFarmerFatherName] = useState('');
  const [newFarmerVillage, setNewFarmerVillage] = useState('');
  const [newFarmerDistrict, setNewFarmerDistrict] = useState('');
  const [newFarmerTehsil, setNewFarmerTehsil] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  const handleRegisterFarmer = async () => {
    if (!newFarmerName.trim()) return Alert.alert('Error', 'Farmer Name is required.');
    if (!newFarmerId.trim()) return Alert.alert('Error', 'Farmer ID / Serial Number is required.');
    
    setRegisterLoading(true);
    try {
      await addFarmer({
        serial_number: newFarmerId.trim(),
        name: newFarmerName.trim(),
        state: newFarmerState.trim(),
        commodity: newFarmerCrop.trim(),
        phone: newFarmerPhone.trim(),
        fatherName: newFarmerFatherName.trim(),
        village: newFarmerVillage.trim(),
        district: newFarmerDistrict.trim(),
        tehsil: newFarmerTehsil.trim(),
      });
      Alert.alert('Success', `Farmer "${newFarmerName}" registered successfully!`);
      setNewFarmerName(''); setNewFarmerId(''); setNewFarmerState('Rajasthan'); setNewFarmerCrop('Potato');
      setNewFarmerPhone(''); setNewFarmerFatherName(''); setNewFarmerVillage('');
      setNewFarmerDistrict(''); setNewFarmerTehsil('');
      onRegisterSuccess();
      onClose();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to register farmer');
    } finally {
      setRegisterLoading(false);
    }
  };

  return {
    newFarmerName, setNewFarmerName, newFarmerId, setNewFarmerId, newFarmerState, setNewFarmerState,
    newFarmerCrop, setNewFarmerCrop, newFarmerPhone, setNewFarmerPhone, newFarmerFatherName,
    setNewFarmerFatherName, newFarmerVillage, setNewFarmerVillage, newFarmerDistrict, setNewFarmerDistrict,
    newFarmerTehsil, setNewFarmerTehsil, registerLoading, handleRegisterFarmer
  };
}
