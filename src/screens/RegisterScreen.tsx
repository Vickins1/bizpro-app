// src/screens/RegisterScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Alert, Dimensions } from 'react-native';
import { Button, Text, TextInput, SegmentedButtons } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { globalStyles } from '../theme';
import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../types';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

const RegisterScreen: React.FC = () => {
  const { theme } = useAppTheme();
  const { register } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    const success = await register(username, password, role);
    setIsLoading(false);

    if (success) {
      setUsername('');
      setPassword('');
      setRole('user');
      Alert.alert('Success', 'Registration successful! Please log in.');
      navigation.navigate('Login');
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
            accessibilityLabel="Register Title"
            accessibilityRole="header"
          >
            Register for BizPro
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
          <SegmentedButtons
            value={role}
            onValueChange={setRole}
            buttons={[
              { value: 'user', label: 'User' },
              { value: 'admin', label: 'Admin' },
            ]}
            style={styles(theme).segmentedButtons}
            theme={{
              colors: {
                primary: theme.colors.primary,
                outline: theme.colors.primary,
              },
            }}
          />
          <Button
            mode="contained"
            onPress={handleRegister}
            style={styles(theme).button}
            buttonColor={theme.colors.primary}
            textColor={theme.colors.text}
            loading={isLoading}
            disabled={isLoading}
            accessible={true}
            accessibilityLabel="Register button"
            accessibilityRole="button"
          >
            Register
          </Button>
          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
            style={styles(theme).linkButton}
            textColor={theme.colors.primary}
            accessible={true}
            accessibilityLabel="Go to Login"
            accessibilityRole="button"
          >
            Already have an account? Login
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
    segmentedButtons: {
      marginVertical: theme.spacing.sm,
    },
    button: {
      marginTop: theme.spacing.sm,
      borderRadius: theme.borderRadius.medium,
      paddingVertical: theme.spacing.xs,
    },
    linkButton: {
      marginTop: theme.spacing.xs,
    },
  });

export default RegisterScreen;
