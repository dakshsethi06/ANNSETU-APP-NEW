import { COLORS } from '../../../core/theme/theme';

export const getCommodityIcon = (name) => {
  switch (name) {
    case 'Potato': return '🥔';
    case 'Tomato': return '🍅';
    case 'Ladyfinger': return '🫛';
    default: return '🌾';
  }
};

export const getCommodityTranslation = (name) => {
  switch (name) {
    case 'Potato': return 'Aloo';
    case 'Tomato': return 'Tamatar';
    case 'Ladyfinger': return 'Bhindi';
    default: return '';
  }
};

export const getWeatherGradient = (condition) => {
  const cond = condition ? condition.toLowerCase() : '';
  if (cond.includes('clear') || cond.includes('sunny')) return ['#FFFDF4', '#FFFDF4', '#FFF4D0'];
  if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || cond.includes('patchy')) return ['#F0F9FF', '#E0F2FE', '#BAE6FD'];
  if (cond.includes('thunder') || cond.includes('storm')) return ['#F8FAFC', '#E2E8F0', '#CBD5E1'];
  return ['#FFFFFF', '#F8FAFC', '#F1F5F9'];
};

export const getWeatherEmoji = (condition) => {
  const cond = condition ? condition.toLowerCase() : '';
  if (cond.includes('clear') || cond.includes('sunny')) return '☀️';
  if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('mist') || cond.includes('haze') || cond.includes('fog')) return '☁️';
  if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || cond.includes('patchy')) return '🌧️';
  if (cond.includes('thunder') || cond.includes('storm')) return '⛈️';
  if (cond.includes('snow') || cond.includes('sleet') || cond.includes('blizzard')) return '❄️';
  return '🌡️';
};

export const getWeatherBg = (condition) => {
  const cond = condition ? condition.toLowerCase() : '';
  if (cond.includes('clear') || cond.includes('sunny')) return '#FFFBEA';
  if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || cond.includes('patchy') || cond.includes('thunder') || cond.includes('storm')) return '#F0F9FF';
  if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('mist') || cond.includes('haze') || cond.includes('fog')) return '#F4F6F7';
  return COLORS.white;
};

export const getWeatherBorderColor = (condition) => {
  const cond = condition ? condition.toLowerCase() : '';
  if (cond.includes('clear') || cond.includes('sunny')) return COLORS.amber;
  if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || cond.includes('patchy') || cond.includes('thunder') || cond.includes('storm')) return '#0EA5E9';
  if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('mist') || cond.includes('haze') || cond.includes('fog')) return '#94A3B8';
  return COLORS.greenLight;
};

export const getDayName = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00');
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
};

export const getAgriAdvisory = (humidity, windSpeed, condition) => {
  const cond = condition ? condition.toLowerCase() : '';
  if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || cond.includes('patchy') || cond.includes('thunder') || cond.includes('storm')) {
    return "🌧️ Rain forecast: Suspend irrigation and secure harvested crops immediately.";
  }
  if (humidity > 80) {
    return "💧 High humidity: Increased risk of fungal pests. Keep a close watch on crops.";
  }
  if (windSpeed > 25) {
    return "💨 Strong winds: Postpone spraying chemical pesticides to avoid drift.";
  }
  return "✅ Good conditions: Ideal for weeding, fertilizer application, and spraying.";
};

export const calculatePrices = (records, selectedCity) => {
  if (!records || records.length === 0) return { minPrice: null, maxPrice: null };
  const filtered = selectedCity ? records.filter((r) => r.market === selectedCity) : records;
  if (filtered.length === 0) return { minPrice: null, maxPrice: null };

  const minList = filtered.map((p) => p.minPrice).filter((v) => v > 0);
  const maxList = filtered.map((p) => p.maxPrice).filter((v) => v > 0);

  const overallMin = minList.length > 0 ? Math.min(...minList) : null;
  const overallMax = maxList.length > 0 ? Math.max(...maxList) : null;

  return {
    minPrice: overallMin,
    maxPrice: overallMax,
  };
};
