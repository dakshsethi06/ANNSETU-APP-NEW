import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { addAmad } from '../../mandi/services/amadService';

export function useAmadModal(visible, defaultFarmerId, onClose, onAmadSuccess) {
  const [amadFarmerId, setAmadFarmerId] = useState('');
  const [amadCommodity, setAmadCommodity] = useState('Potato');
  const [amadKism, setAmadKism] = useState('Pukhraj');
  const [amadRoomId, setAmadRoomId] = useState('Room 1');
  const [amadRackId, setAmadRackId] = useState('Rack A');
  const [amadPackets, setAmadPackets] = useState('');
  const [amadWeightQtl, setAmadWeightQtl] = useState('');
  const [amadGoodsCondition, setAmadGoodsCondition] = useState('Fresh');
  const [amadSubmitLoading, setAmadSubmitLoading] = useState(false);

  useEffect(() => {
    if (visible) setAmadFarmerId(defaultFarmerId || '');
  }, [visible, defaultFarmerId]);

  const handleRegisterAmad = async () => {
    if (!amadFarmerId) return Alert.alert('Error', 'Please select a farmer.');
    if (!amadPackets.trim() || !amadWeightQtl.trim()) return Alert.alert('Error', 'Bags and Weight are required.');
    
    setAmadSubmitLoading(true);
    try {
      await addAmad({
        farmerId: amadFarmerId,
        commodity: amadCommodity,
        kism: amadKism.trim(),
        roomId: amadRoomId.trim(),
        rackId: amadRackId.trim(),
        packets: parseInt(amadPackets.trim(), 10),
        weightQtl: parseFloat(amadWeightQtl.trim()),
        goodsCondition: amadGoodsCondition,
      });
      Alert.alert('Success', 'Amad lot registered successfully!');
      setAmadPackets('');
      setAmadWeightQtl('');
      onAmadSuccess();
      onClose();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to record Amad');
    } finally {
      setAmadSubmitLoading(false);
    }
  };

  return {
    amadFarmerId, setAmadFarmerId, amadCommodity, setAmadCommodity, amadKism, setAmadKism,
    amadRoomId, setAmadRoomId, amadRackId, setAmadRackId, amadPackets, setAmadPackets,
    amadWeightQtl, setAmadWeightQtl, amadGoodsCondition, setAmadGoodsCondition,
    amadSubmitLoading, handleRegisterAmad
  };
}
