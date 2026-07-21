import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { fetchStates } from '../../features/farmer/services/locationService';

export function useStateModal(visible) {
  const [statesList, setStatesList] = useState([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [stateSearch, setStateSearch] = useState('');

  useEffect(() => {
    if (visible && statesList.length === 0) loadStates();
  }, [visible]);

  const loadStates = async () => {
    setStatesLoading(true);
    try {
      const list = await fetchStates();
      setStatesList(list || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load states.');
    } finally {
      setStatesLoading(false);
    }
  };

  const filteredStates = ['All', ...statesList.filter((s) => s.toLowerCase().includes(stateSearch.toLowerCase()))];

  return { stateSearch, setStateSearch, statesLoading, filteredStates };
}
