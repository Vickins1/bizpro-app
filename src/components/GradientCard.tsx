import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';
import { Card } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';

interface GradientCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  animationDelay?: number;
}

const GradientCard: React.FC<GradientCardProps> = ({ children, style, animationDelay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: animationDelay,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, animationDelay]);

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
        style,
      ]}
      accessible={true}
      accessibilityLabel="Gradient card"
    >
      <Card style={[styles.cardContainer, style]} elevation={4}>
        <LinearGradient
          colors={[theme.colors.background, theme.colors.gradientEnd]}
          style={styles.gradient}
        >
          <Card.Content>{children}</Card.Content>
        </LinearGradient>
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    ...theme.shadow,
  } as ViewStyle,
  cardContainer: {
    borderRadius: theme.borderRadius.medium,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    overflow: 'hidden',
  } as ViewStyle,
  gradient: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
  } as ViewStyle,
});

export default GradientCard;