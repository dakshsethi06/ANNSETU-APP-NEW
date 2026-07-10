import React from 'react';
import { View, Modal, TouchableOpacity, Image, ActivityIndicator, Text, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatImageUrl } from '../../../core/network/config';

export function KhataFullscreenImageModal({
  visible,
  onClose,
  fullImageUrl,
  imageLoading,
  setImageLoading,
  imageError,
  setImageError
}) {
  const formattedUrl = formatImageUrl(fullImageUrl);

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 20000 }}>
        <TouchableOpacity
          style={{ position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, right: 20, zIndex: 20010, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Feather name="x" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        {formattedUrl ? (
          <View style={{ width: '100%', height: '85%', justifyContent: 'center', alignItems: 'center' }}>
            <Image
              source={{ uri: formattedUrl }}
              style={{ width: '90%', height: '90%' }}
              resizeMode="contain"
              onLoadStart={() => {
                setImageLoading(true);
                setImageError(false);
              }}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
            {imageLoading && <ActivityIndicator size="large" color="#FFFFFF" style={{ position: 'absolute' }} />}
            {imageError && (
              <View style={{ position: 'absolute', alignItems: 'center', paddingHorizontal: 20 }}>
                <Feather name="image" size={48} color="#A1A1AA" style={{ marginBottom: 12 }} />
                <Text style={{ color: '#FFFFFF', fontSize: 16, textAlign: 'center', fontWeight: 'bold' }}>Failed to load receipt image</Text>
                <Text style={{ color: '#A1A1AA', fontSize: 12, marginTop: 8, textAlign: 'center' }}>{fullImageUrl}</Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
