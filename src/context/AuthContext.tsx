import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import bcrypt from 'bcryptjs';
import db from '../database/db';
import { Alert } from 'react-native';

type User = {
  id: number;
  username: string;
  role: string;
};

type AuthContextType = {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (username: string, password: string, role?: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userId = await SecureStore.getItemAsync('userId');
        if (userId) {
          const result = await db.getFirstAsync<User>(
            'SELECT id, username, role FROM users WHERE id = ?',
            [parseInt(userId)]
          );
          if (result) {
            setUser(result);
          }
        }
      } catch (err) {
        console.warn('Failed to load user:', err);
      }
    };
    loadUser();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const user = await db.getFirstAsync<{ id: number; username: string; password: string; role: string }>(
        'SELECT id, username, password, role FROM users WHERE username = ?',
        [username]
      );
      if (!user) {
        Alert.alert('Error', 'Invalid username or password');
        return false;
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        Alert.alert('Error', 'Invalid username or password');
        return false;
      }

      await SecureStore.setItemAsync('userId', user.id.toString());
      setUser({ id: user.id, username: user.username, role: user.role });
      return true;
    } catch (err) {
      Alert.alert('Error', 'Failed to log in');
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync('userId');
      setUser(null);
    } catch (err) {
      Alert.alert('Error', 'Failed to log out');
    }
  }, []);

  const register = useCallback(async (username: string, password: string, role = 'user') => {
    try {
      // Input validation
      const trimmedUsername = username.trim();
      const trimmedPassword = password.trim();

      if (!trimmedUsername || !trimmedPassword) {
        Alert.alert('Error', 'Username and password cannot be empty');
        return false;
      }

      if (trimmedUsername.length < 3) {
        Alert.alert('Error', 'Username must be at least 3 characters long');
        return false;
      }

      if (trimmedPassword.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters long');
        return false;
      }

      // Username format validation (alphanumeric and underscores only)
      if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
        Alert.alert('Error', 'Username can only contain letters, numbers, and underscores');
        return false;
      }

      // Role validation
      const validRoles = ['user', 'admin'];
      if (!validRoles.includes(role)) {
        Alert.alert('Error', 'Invalid role selected');
        return false;
      }

      // Check for existing user
      const existingUser = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM users WHERE username = ?',
        [trimmedUsername]
      );
      if (existingUser) {
        Alert.alert('Error', 'Username already exists');
        return false;
      }

      // Hash password and insert user in a transaction
      const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
      const date = new Date().toISOString();

      await db.withTransactionAsync(async () => {
        await db.runAsync(
          'INSERT INTO users (username, password, role, createdAt) VALUES (?, ?, ?, ?)',
          [trimmedUsername, hashedPassword, role, date]
        );
      });

      Alert.alert('Success', 'User registered successfully');
      return true;
    } catch (err) {
      console.warn('Registration error:', err);
      Alert.alert('Error', 'Failed to register user. Please try again.');
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};