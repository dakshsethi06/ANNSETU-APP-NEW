import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '../../../core/theme/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../../core/network/supabase';
import layoutStyles from '../styles/layoutStyles';

export default function HomeHeader({ isDarkStatus }) {
  if (isDarkStatus) return null;
  
  return (
    <View style={{ backgroundColor: COLORS.greenDeep }}>
      <LinearGradient colors={[COLORS.greenDeep, COLORS.greenMid]} style={layoutStyles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={[layoutStyles.headerContent, { width: '100%' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <View style={{ flex: 1 }}>
              <Text style={layoutStyles.brandName}>Annsetu</Text>
              <Text style={layoutStyles.brandTagline}>Empowering Indian Agrarian Cold Storage Systems</Text>
            </View>
            <TouchableOpacity onPress={() => supabase.auth.signOut()} style={{ padding: 10, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 20, marginLeft: 12 }} activeOpacity={0.7}>
              <Feather name="log-out" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={layoutStyles.headerAccent} />
        </View>
      </LinearGradient>
    </View>
  );
}
