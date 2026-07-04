import React from 'react';
import { View, Image } from 'react-native';

export default function AnnsetuLogo({ size = 38, backgroundColor = '#1E5C2E', iconColor = '#FFFFFF', style }) {
  const containerSize = size;
  const iconSize = size * (22 / 38);
  const borderRadius = size * (12 / 38);

  return (
    <View style={[{
      width: containerSize,
      height: containerSize,
      borderRadius: borderRadius,
      backgroundColor: backgroundColor,
      justifyContent: 'center',
      alignItems: 'center',
    }, style]}>
      <Image 
        source={require('../../assets/ann_setu_logo.png')} 
        style={{ width: iconSize, height: iconSize, tintColor: iconColor }} 
        resizeMode="contain" 
      />
    </View>
  );
}
