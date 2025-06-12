// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Alert, Dimensions } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { globalStyles } from '../theme';
import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const LoginScreen: React.FC = () => {
  const { theme } = useAppTheme();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    setIsLoading(true);
    const success = await login(username, password);
    setIsLoading(false);

    if (success) {
      setUsername('');
      setPassword('');
    }
  };

  return (
    <View style={[globalStyles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles(theme).gradient}
      >
        <View style={styles(theme).formContainer}>
          <Text
            variant="displaySmall"
            style={[globalStyles.title, { fontSize: theme.typography.display.fontSize, color: theme.colors.text }]}
            accessible={true}
            accessibilityLabel="Login Title"
            accessibilityRole="header"
          >
            Login to BizPro
          </Text>
          <TextInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            mode="outlined"
            style={styles(theme).input}
            theme={{
              roundness: theme.borderRadius.medium,
              colors: {
                text: theme.colors.text,
                primary: theme.colors.primary,
                background: theme.colors.background,
                placeholder: theme.colors.secondary,
                outline: theme.colors.primary,
              },
            }}
            textColor={theme.colors.text}
            accessible={true}
            accessibilityLabel="Username input"
            accessibilityRole="text"
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry
            style={styles(theme).input}
            theme={{
              roundness: theme.borderRadius.medium,
              colors: {
                text: theme.colors.text,
                primary: theme.colors.primary,
                background: theme.colors.background,
                placeholder: theme.colors.secondary,
                outline: theme.colors.primary,
              },
            }}
            textColor={theme.colors.text}
            accessible={true}
            accessibilityLabel="Password input"
            accessibilityRole="text"
          />
          <Button
            mode="contained"
            onPress={handleLogin}
            style={styles(theme).button}
            buttonColor={theme.colors.primary}
            textColor={theme.colors.text}
            loading={isLoading}
            disabled={isLoading}
            accessible={true}
            accessibilityLabel="Login button"
            accessibilityRole="button"
          >
            Login
          </Button>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = (theme: typeof import('../theme').lightTheme) =>
  StyleSheet.create({
    gradient: {
      flex: 1,
      paddingHorizontal: theme.spacing.md,
      justifyContent: 'center',
    },
    formContainer: {
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background,
      elevation: theme.elevation,
      marginHorizontal: width * 0.05,
    },
    input: {
      marginBottom: theme.spacing.sm,
    },
    button: {
      marginTop: theme.spacing.sm,
      borderRadius: theme.borderRadius.medium,
      paddingVertical: theme.spacing.xs,
    },
  });

export default LoginScreen;