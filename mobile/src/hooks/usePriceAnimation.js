import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

export function usePriceAnimation(value) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!value || value === 0) return;

    animatedValue.setValue(0);
    setDisplayValue(0);

    Animated.spring(animatedValue, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    const duration = 800;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(value * eased);
      setDisplayValue(current);

      if (progress >= 1) {
        clearInterval(interval);
        setDisplayValue(value);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [value]);

  const scale = animatedValue.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const opacity = animatedValue.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return { displayValue, scale, opacity };
}
