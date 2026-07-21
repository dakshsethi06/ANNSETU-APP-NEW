import { useState, useEffect } from 'react';
import { fetchMandiPrices } from '../services/mandiService';
import { calculatePrices } from '../../farmer/screens/helpers';

export function useMandiDashboard() {
  const [loading, setLoading] = useState(false);
  const [minPrice, setMinPrice] = useState(null);
  const [maxPrice, setMaxPrice] = useState(null);
  const [error, setError] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedCommodity, setSelectedCommodity] = useState('Potato');
  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [commodityModalVisible, setCommodityModalVisible] = useState(false);
  const [citiesList, setCitiesList] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [allMandiRecords, setAllMandiRecords] = useState([]);

  useEffect(() => {
    if (selectedState) loadCitiesForState(selectedState, selectedCommodity);
  }, [selectedState, selectedCommodity]);

  const loadCitiesForState = async (state, commodity) => {
    setCitiesLoading(true);
    try {
      const result = await fetchMandiPrices(state, commodity);
      const records = result.records || [];
      setAllMandiRecords(records);
      const uniqueCities = [...new Set(records.map((r) => r.market))];
      setCitiesList(uniqueCities);
      setSelectedCity(uniqueCities.length > 0 ? uniqueCities[0] : null);
    } catch (err) {
      console.warn('Failed to load cities:', err.message);
    } finally {
      setCitiesLoading(false);
    }
  };

  useEffect(() => {
    const { minPrice: computedMin, maxPrice: computedMax } = calculatePrices(allMandiRecords, selectedCity);
    setMinPrice(computedMin);
    setMaxPrice(computedMax);
  }, [selectedCity, allMandiRecords]);

  const handleFetch = async () => {
    if (!selectedState) return setError('Please select a state first.');
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMandiPrices(selectedState, selectedCommodity);
      setAllMandiRecords(result.records || []);
    } catch (err) {
      setError(err.message);
      setAllMandiRecords([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading, minPrice, maxPrice, error, setError, selectedState, setSelectedState,
    selectedCity, setSelectedCity, selectedCommodity, setSelectedCommodity,
    stateModalVisible, setStateModalVisible, cityModalVisible, setCityModalVisible,
    commodityModalVisible, setCommodityModalVisible, citiesList, citiesLoading,
    handleFetch
  };
}
