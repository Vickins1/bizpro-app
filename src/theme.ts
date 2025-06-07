import { StyleSheet, TextStyle, ViewStyle } from 'react-native';

export const theme = {
  colors: {
    background: '#1A1A1A', // Dark gray for professional dark background
    text: '#E5E5E5', // Light gray for readable text
    primary: '#3B82F6', // Professional blue for primary elements (buttons, FAB)
    secondary: '#6B7280', // Muted gray for secondary elements (inactive tabs)
    accent: '#D4AF37', // Subtle gold for highlights (icons, text)
    error: '#EF4444', // Slightly brighter red for errors, still professional
    gradientStart: 'rgba(59, 130, 246, 0.8)', // Blue gradient start for cards/modals
    gradientEnd: 'rgba(59, 130, 246, 0.2)', // Blue gradient end
    modalOverlay: 'rgba(0, 0, 0, 0.7)', // Darker overlay for modals
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
    shadowOpacity: 0.3, // Slightly increased for dark theme visibility
    shadowRadius: 8,
    elevation: 5,
  } as ViewStyle,
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  } as ViewStyle,
  title: {
    color: theme.colors.text,
    fontWeight: 'bold',
    letterSpacing: 1,
  } as TextStyle,
  cardTitle: {
    color: theme.colors.text,
    fontWeight: '600',
  } as TextStyle,
  cardText: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '500',
  } as TextStyle,
});