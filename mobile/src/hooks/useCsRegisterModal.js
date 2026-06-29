import { useState } from 'react';
import { Alert } from 'react-native';
import { addColdStorage } from '../services/api';

export function useCsRegisterModal(onClose, onRegisterSuccess) {
  const [newCsName, setNewCsName] = useState('');
  const [newCsCity, setNewCsCity] = useState('');
  const [newCsDistrict, setNewCsDistrict] = useState('');
  const [newCsState, setNewCsState] = useState('');
  const [newCsAddress, setNewCsAddress] = useState('');
  const [newCsContactPerson, setNewCsContactPerson] = useState('');
  const [newCsPhone, setNewCsPhone] = useState('');
  const [csRegisterLoading, setCsRegisterLoading] = useState(false);

  const handleRegisterColdStorage = async () => {
    if (!newCsName.trim()) return Alert.alert('Error', 'Storage Name is required.');
    
    setCsRegisterLoading(true);
    try {
      const storageId = 'cs_' + Math.random().toString(36).substring(2, 11);
      await addColdStorage({
        id: storageId,
        displayName: newCsName.trim(),
        city: newCsCity.trim() || 'Tundla',
        district: newCsDistrict.trim() || 'Firozabad',
        state: newCsState.trim() || 'Uttar Pradesh',
        address: newCsAddress.trim() || undefined,
        contactPerson: newCsContactPerson.trim() || undefined,
        phone: newCsPhone.trim() || undefined,
      });
      Alert.alert('Success', `Cold Storage "${newCsName}" registered successfully!`);
      setNewCsName(''); setNewCsCity(''); setNewCsDistrict(''); setNewCsState('');
      setNewCsAddress(''); setNewCsContactPerson(''); setNewCsPhone('');
      onRegisterSuccess(storageId);
      onClose();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to register cold storage');
    } finally {
      setCsRegisterLoading(false);
    }
  };

  return {
    newCsName, setNewCsName, newCsCity, setNewCsCity, newCsDistrict, setNewCsDistrict,
    newCsState, setNewCsState, newCsAddress, setNewCsAddress, newCsContactPerson,
    setNewCsContactPerson, newCsPhone, setNewCsPhone, csRegisterLoading, handleRegisterColdStorage
  };
}
