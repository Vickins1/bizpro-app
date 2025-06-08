import { StyleSheet, TextStyle, ViewStyle } from 'react-native';

export const lightTheme = {
  colors: {
    background: '#F5F5F5', // Light gray for background
    text: '#1A1A1A', // Dark gray for text
    primary: '#3B82F6', // Professional blue
    secondary: '#6B7280', // Muted gray
    accent: '#D4AF37', // Gold for highlights
    error: '#EF4444', // Red for errors
    gradientStart: 'rgba(59, 130, 246, 0.8)',
    gradientEnd: 'rgba(59, 130, 246, 0.2)',
    modalOverlay: 'rgba(0, 0, 0, 0.7)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    display: { fontSize: 34, fontWeight: 'bold' },
    title: { fontSize: 24, fontWeight: '600' },
    body: { fontSize: 16, fontWeight: 'normal' },
    caption: { fontSize: 12, fontWeight: 'normal' },
  },
  borderRadius: {
    medium: 8,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  } as ViewStyle,
  elevation: 5,
};

export const darkTheme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    background: '#1A1A1A', // Dark gray
    text: '#E5E5E5', // Light gray
  },
  elevation: 5,
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  title: {
    fontWeight: 'bold',
    letterSpacing: 1,
  } as TextStyle,
  cardTitle: {
    fontWeight: '600',
  } as TextStyle,
  cardText: {
    fontSize: lightTheme.typography.body.fontSize,
    fontWeight: '500',
  } as TextStyle,
});