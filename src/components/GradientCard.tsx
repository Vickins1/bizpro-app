import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle, View } from 'react-native';
import { Surface } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../context/ThemeContext';

interface GradientCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  animationDelay?: number;
  accessibilityLabel?: string;
  accessibilityRole?: 'none' | 'region';
}

const GradientCard: React.FC<GradientCardProps> = ({
  children,
  style,
  animationDelay = 0,
  accessibilityLabel = 'Gradient card',
  accessibilityRole = 'region',
}) => {
  const { theme } = useAppTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: animationDelay,
      useNativeDriver: true,
    }).start();

    return () => {
      fadeAnim.stopAnimation();
    };
  }, [fadeAnim, animationDelay]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        },
        style,
      ]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="none" // Wrapper role; Surface handles semantic role
    >
      <Surface style={[styles.surfaceContainer, style]} elevation={theme.elevation as any}>
        <LinearGradient
          colors={[theme.colors.background, theme.colors.gradientEnd]}
          style={styles.gradient}
        >
          <View style={styles.content}>{children}</View>
        </LinearGradient>
      </Surface>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8, // theme.spacing.sm
    marginHorizontal: 16, // theme.spacing.md
    borderRadius: 8, // theme.borderRadius.medium
  } as ViewStyle,
  surfaceContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  } as ViewStyle,
  gradient: {
    borderRadius: 8,
  } as ViewStyle,
  content: {
    padding: 16, // theme.spacing.md
  } as ViewStyle,
});

export default GradientCard;