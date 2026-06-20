import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConnectionMode } from '../types';
import { pair } from '../api';
import { s, colors } from '../styles';

interface ConnectScreenProps {
  connectionMode: ConnectionMode;
  setConnectionMode: (mode: ConnectionMode) => void;
  onConnected: (ip: string, token: string) => void;
  onGithubConnected: (token: string) => void;
}

export default function ConnectScreen({
  connectionMode,
  setConnectionMode,
  onConnected,
  onGithubConnected,
}: ConnectScreenProps) {
  const [serverIp, setServerIp] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePair = async () => {
    if (!serverIp) {
      Alert.alert('Error', 'Please enter your PC IP address & port (e.g. 192.168.1.50:3011)');
      return;
    }
    if (!pairingCode) {
      Alert.alert('Error', 'Please enter the 4-digit pairing code shown in the PC server console.');
      return;
    }

    setLoading(true);
    try {
      const data = await pair(serverIp.trim(), pairingCode.trim());
      const newToken = data.token;

      await AsyncStorage.setItem('server_ip', serverIp.trim());
      await AsyncStorage.setItem('auth_token', newToken);
      await AsyncStorage.setItem('connection_mode', 'pc');
      onConnected(serverIp.trim(), newToken);
    } catch (err: any) {
      const msg = err.message || '';
      const isTimeout = msg.includes('abort') || msg.includes('cancel') || msg.includes('timeout');
      Alert.alert(
        'Pairing Failed',
        isTimeout
          ? 'Connection timed out (30s).\n\nEnsure:\n• PC Agent is running (npm start in pc-agent/)\n• Firewall allows port 3011\n• Phone and PC are on the same WiFi'
          : msg || 'Could not connect to PC Agent. Check the IP and make sure the server is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGithubPair = async () => {
    if (!githubToken.trim()) {
      Alert.alert('Error', 'Please enter a GitHub Personal Access Token (PAT).');
      return;
    }

    setLoading(true);
    try {
      await AsyncStorage.setItem('github_token', githubToken.trim());
      await AsyncStorage.setItem('connection_mode', 'github');
      onGithubConnected(githubToken.trim());
    } catch (err: any) {
      Alert.alert('Pairing Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={s.modeTabs}>
        <TouchableOpacity
          style={[s.modeTabButton, connectionMode === 'pc' ? s.modeTabActive : {}]}
          onPress={() => setConnectionMode('pc')}
        >
          <Text style={[s.modeTabText, connectionMode === 'pc' ? s.modeTabActiveText : {}]}>🖥️ PC Agent</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.modeTabButton, connectionMode === 'github' ? s.modeTabActive : {}]}
          onPress={() => setConnectionMode('github')}
        >
          <Text style={[s.modeTabText, connectionMode === 'github' ? s.modeTabActiveText : {}]}>☁️ GitHub Cloud</Text>
        </TouchableOpacity>
      </View>

      {connectionMode === 'pc' ? (
        <View style={s.card}>
          <Text style={s.appTitle}>⚡ PC Local Sync</Text>
          <Text style={s.subtitle}>Review files and execute commits on your local machine.</Text>

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>PC Server IP & Port</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. 192.168.1.50:3011"
              placeholderTextColor="#6B7280"
              value={serverIp}
              onChangeText={setServerIp}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>4-Digit Pairing Code</Text>
            <TextInput
              style={s.input}
              placeholder="Check PC terminal console"
              placeholderTextColor="#6B7280"
              value={pairingCode}
              onChangeText={setPairingCode}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>

          <TouchableOpacity style={s.primaryButton} onPress={handlePair} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <Text style={s.buttonText}>Connect Local Agent</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.appTitle}>☁️ GitHub Cloud Mode</Text>
          <Text style={s.subtitle}>Connect directly to GitHub API when your PC is turned off.</Text>

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>GitHub Personal Access Token (PAT)</Text>
            <TextInput
              style={s.input}
              placeholder="Paste token starting with ghp_ or github_pat_"
              placeholderTextColor="#6B7280"
              value={githubToken}
              onChangeText={setGithubToken}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity style={s.primaryButton} onPress={handleGithubPair} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <Text style={s.buttonText}>Authorize GitHub Account</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={s.infoCard}>
        <Text style={s.infoTitle}>💡 Security Notice</Text>
        <Text style={s.infoText}>Your server pairing keys and GitHub personal access tokens are stored strictly inside your phone's secure local Sandbox. They are never sent to any external server besides GitHub's official REST API.</Text>
      </View>
    </ScrollView>
  );
}
