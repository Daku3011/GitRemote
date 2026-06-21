import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image
} from 'react-native';
import { COLORS } from '../utils/theme';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

interface ConnectScreenProps {
  connectionMode: 'pc' | 'github';
  setConnectionMode: (mode: 'pc' | 'github') => void;
  serverIp: string;
  setServerIp: (ip: string) => void;
  pairingCode: string;
  setPairingCode: (code: string) => void;
  githubToken: string;
  setGithubToken: (token: string) => void;
  loading: boolean;
  scanProgress: string;
  onPairAgent: (ip: string, code: string) => Promise<boolean>;
  onAuthorizeGithub: (token: string) => Promise<boolean>;
  onDiscoverAgent: (ipInput: string) => Promise<string | null>;
}

export const ConnectScreen: React.FC<ConnectScreenProps> = ({
  connectionMode,
  setConnectionMode,
  serverIp,
  setServerIp,
  pairingCode,
  setPairingCode,
  githubToken,
  setGithubToken,
  loading,
  scanProgress,
  onPairAgent,
  onAuthorizeGithub,
  onDiscoverAgent,
}) => {
  const [ipError, setIpError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [tokenError, setTokenError] = useState('');

  const handlePCConnect = async () => {
    let valid = true;
    if (!serverIp) {
      setIpError('Server IP and port is required');
      valid = false;
    } else {
      setIpError('');
    }

    if (!pairingCode) {
      setCodeError('4-digit pairing code is required');
      valid = false;
    } else if (pairingCode.length !== 4) {
      setCodeError('Pairing code must be 4 digits');
      valid = false;
    } else {
      setCodeError('');
    }

    if (valid) {
      await onPairAgent(serverIp, pairingCode);
    }
  };

  const handleGithubConnect = async () => {
    if (!githubToken) {
      setTokenError('Personal Access Token is required');
      return;
    }
    setTokenError('');
    await onAuthorizeGithub(githubToken);
  };

  const handleAutoDiscover = async () => {
    await onDiscoverAgent(serverIp);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.logoHeader}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>GitRemote</Text>
        </View>

        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTabButton, connectionMode === 'pc' ? styles.modeTabActive : {}]}
            onPress={() => setConnectionMode('pc')}
          >
            <Text style={[styles.modeTabText, connectionMode === 'pc' ? styles.modeTabActiveText : {}]}>
              🖥️ PC Agent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTabButton, connectionMode === 'github' ? styles.modeTabActive : {}]}
            onPress={() => setConnectionMode('github')}
          >
            <Text style={[styles.modeTabText, connectionMode === 'github' ? styles.modeTabActiveText : {}]}>
              ☁️ GitHub Cloud
            </Text>
          </TouchableOpacity>
        </View>

        {connectionMode === 'pc' ? (
          <Card style={styles.card}>
            <Text style={styles.appTitle}>⚡ PC Local Sync</Text>
            <Text style={styles.subtitle}>
              Review files, inspect changes, and commit on your local PC.
            </Text>

            <Input
              label="PC Server IP & Port"
              placeholder="e.g. 192.168.1.50:3011"
              value={serverIp}
              onChangeText={setServerIp}
              error={ipError}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Input
              label="4-Digit Pairing Code"
              placeholder="Check PC terminal console"
              value={pairingCode}
              onChangeText={setPairingCode}
              error={codeError}
              keyboardType="number-pad"
              maxLength={4}
            />

            {scanProgress ? (
              <View style={styles.progressContainer}>
                <ActivityIndicator color={COLORS.primary} size="small" />
                <Text style={styles.progressText}>{scanProgress}</Text>
              </View>
            ) : null}

            <View style={styles.buttonGroup}>
              <Button
                title="Connect Local Agent"
                onPress={handlePCConnect}
                loading={loading && !scanProgress}
                style={styles.actionBtn}
              />
              
              <Button
                title="🔍 Auto-Discover PC"
                onPress={handleAutoDiscover}
                variant="outline"
                disabled={loading}
                style={styles.scanBtn}
              />
            </View>
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.appTitle}>☁️ GitHub Cloud Mode</Text>
            <Text style={styles.subtitle}>
              Connect directly to GitHub REST API when your companion computer is shut down.
            </Text>

            <Input
              label="GitHub Personal Access Token (PAT)"
              placeholder="Paste token starting with ghp_ or github_pat_"
              value={githubToken}
              onChangeText={setGithubToken}
              error={tokenError}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Button
              title="Authorize GitHub Account"
              onPress={handleGithubConnect}
              loading={loading}
              variant="secondary"
            />
          </Card>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🛡️ Sandboxed Security</Text>
          <Text style={styles.infoText}>
            Pairing tokens and access credentials are strictly stored in the secure local Keychain storage of your phone. They are only sent directly to your local PC Agent server or the official secure GitHub REST API endpoints.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  logoHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: 20,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
  },
  logoText: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scrollContainer: {
    padding: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#161D30',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  modeTabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: COLORS.surface,
  },
  modeTabText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  modeTabActiveText: {
    color: COLORS.secondary,
  },
  card: {
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonGroup: {
    marginTop: 10,
  },
  actionBtn: {
    marginBottom: 12,
  },
  scanBtn: {
    borderColor: COLORS.border,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceDark,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 10,
    flex: 1,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
});
export default ConnectScreen;
