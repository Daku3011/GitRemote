import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { s } from './src/styles';
import { ConnectionMode, Screen, Workspace } from './src/types';

import ConnectScreen from './src/screens/ConnectScreen';
import WorkspacesScreen from './src/screens/WorkspacesScreen';
import WorkspaceDetailScreen from './src/screens/WorkspaceDetailScreen';
import GithubReposScreen from './src/screens/GithubReposScreen';
import GithubTreeScreen from './src/screens/GithubTreeScreen';
import GithubFileScreen from './src/screens/GithubFileScreen';

export default function App() {
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('pc');
  const [serverIp, setServerIp] = useState('');
  const [token, setToken] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [screen, setScreen] = useState<Screen>('connect');
  const [loading, setLoading] = useState(false);

  // Shared states for GitHub flow
  const [githubSelectedRepo, setGithubSelectedRepo] = useState<any>(null);
  const [githubSelectedFile, setGithubSelectedFile] = useState<any>(null);

  useEffect(() => {
    loadSavedConnection();
  }, []);

  const loadSavedConnection = async () => {
    try {
      const savedIp = await AsyncStorage.getItem('server_ip');
      const savedToken = await AsyncStorage.getItem('auth_token');
      const savedGithubToken = await AsyncStorage.getItem('github_token');
      const savedMode = await AsyncStorage.getItem('connection_mode');

      if (savedMode === 'github' && savedGithubToken) {
        setConnectionMode('github');
        setGithubToken(savedGithubToken);
        setScreen('github-repos');
      } else if (savedIp && savedToken) {
        setConnectionMode('pc');
        setServerIp(savedIp);
        setToken(savedToken);
        setScreen('workspaces');
      } else {
        if (savedIp) setServerIp(savedIp);
        if (savedGithubToken) setGithubToken(savedGithubToken);
      }
    } catch {
      // ignore
    }
  };

  const handlePcConnected = (ip: string, authToken: string) => {
    setServerIp(ip);
    setToken(authToken);
    setConnectionMode('pc');
    setScreen('workspaces');
  };

  const handleGithubConnected = (ghToken: string) => {
    setGithubToken(ghToken);
    setConnectionMode('github');
    setScreen('github-repos');
  };

  const handlePcDisconnect = async () => {
    await AsyncStorage.multiRemove(['server_ip', 'auth_token', 'connection_mode']);
    setToken('');
    setServerIp('');
    setScreen('connect');
  };

  const handleGithubDisconnect = async () => {
    await AsyncStorage.multiRemove(['github_token', 'connection_mode']);
    setGithubToken('');
    setGithubSelectedRepo(null);
    setGithubSelectedFile(null);
    setScreen('connect');
  };

  const handleSelectWorkspace = (workspace: Workspace) => {
    setGithubSelectedRepo(workspace);
    setScreen('detail');
  };

  const handleSelectGithubRepo = (repo: any) => {
    setGithubSelectedRepo(repo);
    setGithubSelectedFile(null);
    setScreen('github-tree');
  };

  const handleOpenGithubFile = (file: any) => {
    setGithubSelectedFile(file);
    setScreen('github-file');
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />

      {screen === 'connect' && (
        <ConnectScreen
          connectionMode={connectionMode}
          setConnectionMode={setConnectionMode}
          onConnected={handlePcConnected}
          onGithubConnected={handleGithubConnected}
        />
      )}

      {screen === 'workspaces' && serverIp && token && (
        <WorkspacesScreen
          serverIp={serverIp}
          token={token}
          onSelect={handleSelectWorkspace}
          onDisconnect={handlePcDisconnect}
        />
      )}

      {screen === 'detail' && githubSelectedRepo && (
        <WorkspaceDetailScreen
          workspace={githubSelectedRepo as unknown as Workspace}
          serverIp={serverIp}
          token={token}
          onBack={() => setScreen('workspaces')}
        />
      )}

      {screen === 'github-repos' && githubToken && (
        <GithubReposScreen
          githubToken={githubToken}
          onSelectRepo={handleSelectGithubRepo}
          onDisconnect={handleGithubDisconnect}
        />
      )}

      {screen === 'github-tree' && githubSelectedRepo && githubToken && (
        <GithubTreeScreen
          repo={githubSelectedRepo}
          githubToken={githubToken}
          onOpenFile={handleOpenGithubFile}
          onBack={() => setScreen('github-repos')}
        />
      )}

      {screen === 'github-file' && githubSelectedRepo && githubSelectedFile && githubToken && (
        <GithubFileScreen
          repo={githubSelectedRepo}
          file={githubSelectedFile}
          githubToken={githubToken}
          onBack={() => setScreen('github-tree')}
        />
      )}

      {loading && (
        <View style={s.globalLoader}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      )}
    </SafeAreaView>
  );
}
