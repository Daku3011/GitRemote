import { Platform } from 'react-native';

export const COLORS = {
  background: '#070A13', // Deep obsidian dark mode
  surface: '#111726',    // Glassmorphic surface dark blue-gray
  surfaceDark: '#0A0E18', // Darker background contrast
  border: 'rgba(255, 255, 255, 0.06)', // Subtle white border
  borderActive: '#4F46E5', // Active element border

  // Accent Colors
  primary: '#6366F1',     // Electric indigo
  primaryGradient: ['#6366F1', '#4F46E5'],
  secondary: '#3B82F6',   // Neon blue
  success: '#10B981',     // Emerald/mint green for staged
  danger: '#EF4444',      // Crimson red for deleted/errors
  warning: '#F59E0B',     // Amber for warnings

  // Text
  text: '#F9FAFB',        // Off-white primary text
  textMuted: '#9CA3AF',   // Cool gray secondary text
  textSecondary: '#D1D5DB', // Mid-gray
  textDark: '#0B0F19',    // Pitch black for high contrast buttons
};

export const FONTS = {
  mono: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  sans: SystemSansFont(),
};

function SystemSansFont() {
  return Platform.OS === 'ios' ? 'System' : 'sans-serif';
}

export const SHADOWS = {
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  }
};
