import React from 'react';
import { View } from 'react-native';

export default function AnnsetuLogo({ size = 60, backgroundColor = '#2A5D43', iconColor = '#FFFFFF', style }) {
  const containerSize = size;
  const strokeWidth = size * 0.08;
  const chevronSize = size * 0.35;
  const leafSize = size * 0.16;

  return (
    <View style={[{
      width: containerSize,
      height: containerSize,
      borderRadius: containerSize * 0.24,
      backgroundColor: backgroundColor,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    }, style]}>
      {/* Top Chevron */}
      <View style={{
        width: chevronSize,
        height: chevronSize,
        borderTopWidth: strokeWidth,
        borderLeftWidth: strokeWidth,
        borderColor: iconColor,
        transform: [{ rotate: '45deg' }],
        position: 'absolute',
        top: containerSize * 0.20,
      }} />

      {/* Middle Chevron */}
      <View style={{
        width: chevronSize,
        height: chevronSize,
        borderTopWidth: strokeWidth,
        borderLeftWidth: strokeWidth,
        borderColor: iconColor,
        transform: [{ rotate: '45deg' }],
        position: 'absolute',
        top: containerSize * 0.32,
      }} />

      {/* Bottom Chevron */}
      <View style={{
        width: chevronSize,
        height: chevronSize,
        borderTopWidth: strokeWidth,
        borderLeftWidth: strokeWidth,
        borderColor: iconColor,
        transform: [{ rotate: '45deg' }],
        position: 'absolute',
        top: containerSize * 0.44,
      }} />

      {/* Leaf inside/bottom */}
      <View style={{
        width: leafSize,
        height: leafSize,
        borderTopLeftRadius: leafSize,
        borderBottomRightRadius: leafSize,
        backgroundColor: iconColor,
        transform: [{ rotate: '45deg' }],
        position: 'absolute',
        bottom: containerSize * 0.22,
      }} />
    </View>
  );
}
