import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Pure JS Base64 Helpers for Hermes Runtime ---
const decodeBase64 = (str: string) => {
  const cleaned = str.replace(/\s/g, '');
  if (typeof atob === 'function') {
    try {
      return decodeURIComponent(escape(atob(cleaned)));
    } catch (e) {
      return atob(cleaned);
    }
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  let bufferLength = cleaned.length * 0.75;
  if (cleaned[cleaned.length - 1] === '=') {
    bufferLength--;
    if (cleaned[cleaned.length - 2] === '=') {
      bufferLength--;
    }
  }
  let bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < cleaned.length; i += 4) {
    let base641 = lookup[cleaned.charCodeAt(i)];
    let base642 = lookup[cleaned.charCodeAt(i + 1)];
    let base643 = lookup[cleaned.charCodeAt(i + 2)];
    let base644 = lookup[cleaned.charCodeAt(i + 3)];
    
    let bytes1 = (base641 << 2) | (base642 >> 4);
    let bytes2 = ((base642 & 15) << 4) | (base643 >> 2);
    let bytes3 = ((base643 & 3) << 6) | (base644 & 63);
    
    bytes[p++] = bytes1;
    if (p < bufferLength) bytes[p++] = bytes2;
    if (p < bufferLength) bytes[p++] = bytes3;
  }
  let utf8String = '';
  for (let i = 0; i < bytes.length; i++) {
    utf8String += String.fromCharCode(bytes[i]);
  }
  try {
    return decodeURIComponent(escape(utf8String));
  } catch (e) {
    return utf8String;
  }
};

const encodeBase64 = (str: string) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const utf8 = unescape(encodeURIComponent(str));
  const bytes = new Uint8Array(utf8.length);
  for (let i = 0; i < utf8.length; i++) {
    bytes[i] = utf8.charCodeAt(i);
  }
  let result = '';
  let i;
  const l = bytes.length;
  for (i = 2; i < l; i += 3) {
    result += chars[bytes[i - 2] >> 2];
    result += chars[((bytes[i - 2] & 3) << 4) | (bytes[i - 1] >> 4)];
    result += chars[((bytes[i - 1] & 15) << 2) | (bytes[i] >> 6)];
    result += chars[bytes[i] & 63];
  }
  if (i === l + 1) {
    result += chars[bytes[i - 2] >> 2];
    result += chars[(bytes[i - 2] & 3) << 4];
    result += '==';
  } else if (i === l) {
    result += chars[bytes[i - 2] >> 2];
    result += chars[((bytes[i - 2] & 3) << 4) | (bytes[i - 1] >> 4)];
    result += chars[(bytes[i - 1] & 15) << 2];
    result += '=';
  }
  return result;
};

export default function App() {
  // Global Mode selection
  const [connectionMode, setConnectionMode] = useState<'pc' | 'github'>('pc');

  // --- PC CONNECTION STATES ---
  const [serverIp, setServerIp] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [token, setToken] = useState('');
  const [isPaired, setIsPaired] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<any>(null);
  const [workspaceStatus, setWorkspaceStatus] = useState<any>(null);
  const [commitMessage, setCommitMessage] = useState('');
  
  // PC Mode Diffs
  const [diffVisible, setDiffVisible] = useState(false);
  const [diffFile, setDiffFile] = useState('');
  const [diffContent, setDiffContent] = useState('');
  const [diffIsStaged, setDiffIsStaged] = useState(false);
  const [consoleVisible, setConsoleVisible] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState('');

  // --- GITHUB CLOUD MODE STATES ---
  const [githubToken, setGithubToken] = useState('');
  const [githubIsPaired, setGithubIsPaired] = useState(false);
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [githubSelectedRepo, setGithubSelectedRepo] = useState<any>(null);
  const [githubPathStack, setGithubPathStack] = useState<string[]>([]);
  const [githubContents, setGithubContents] = useState<any[]>([]);
  const [githubSelectedFile, setGithubSelectedFile] = useState<any>(null);
  const [githubFileContent, setGithubFileContent] = useState('');
  const [githubFileSha, setGithubFileSha] = useState('');
  const [githubCommitMessage, setGithubCommitMessage] = useState('');
  const [githubIsEditing, setGithubIsEditing] = useState(false);

  // App screen state
  // Mode PC: 'connect' | 'workspaces' | 'detail'
  // Mode GitHub: 'connect' | 'github-repos' | 'github-tree' | 'github-file'
  const [screen, setScreen] = useState('connect');
  const [loading, setLoading] = useState(false);

  // Load saved configurations on launch
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
        setGithubIsPaired(true);
        setScreen('github-repos');
        fetchGithubRepos(savedGithubToken);
      } else if (savedIp && savedToken) {
        setConnectionMode('pc');
        setServerIp(savedIp);
        setToken(savedToken);
        setIsPaired(true);
        setScreen('workspaces');
        fetchWorkspaces(savedIp, savedToken);
      } else {
        if (savedIp) setServerIp(savedIp);
        if (savedGithubToken) setGithubToken(savedGithubToken);
      }
    } catch (e) {
      console.log('Error loading saved connections', e);
    }
  };

  // --- PC AGENT METHOD HANDLERS ---
  const apiCall = async (targetIp: string, authToken: string, method: string, path: string, body: any = null) => {
    const url = `http://${targetIp}${path}`;
    const headers: any = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
        signal: controller.signal
      });
      clearTimeout(id);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }
      return await response.json();
    } catch (err: any) {
      clearTimeout(id);
      throw err;
    }
  };

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
      const data = await apiCall(serverIp, '', 'POST', '/api/pair', { code: pairingCode.trim() });
      const newToken = data.token;
      
      await AsyncStorage.setItem('server_ip', serverIp.trim());
      await AsyncStorage.setItem('auth_token', newToken);
      await AsyncStorage.setItem('connection_mode', 'pc');
      setToken(newToken);
      setIsPaired(true);
      setScreen('workspaces');
      await fetchWorkspaces(serverIp.trim(), newToken);
    } catch (err: any) {
      Alert.alert('Pairing Failed', err.message || 'Could not connect to PC Agent. Check the IP and make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaces = async (targetIp = serverIp, authToken = token) => {
    setLoading(true);
    try {
      const data = await apiCall(targetIp, authToken, 'GET', '/api/workspaces');
      setWorkspaces(data);
    } catch (err: any) {
      Alert.alert('Fetch Failed', 'Failed to retrieve projects. Check connection to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    Alert.alert('Disconnect', 'Are you sure you want to disconnect?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          if (connectionMode === 'pc') {
            await AsyncStorage.removeItem('server_ip');
            await AsyncStorage.removeItem('auth_token');
            setToken('');
            setIsPaired(false);
            setWorkspaces([]);
            setSelectedWorkspace(null);
            setWorkspaceStatus(null);
          } else {
            await AsyncStorage.removeItem('github_token');
            setGithubToken('');
            setGithubIsPaired(false);
            setGithubRepos([]);
            setGithubSelectedRepo(null);
          }
          await AsyncStorage.removeItem('connection_mode');
          setScreen('connect');
        }
      }
    ]);
  };

  const openWorkspace = async (workspace: any) => {
    setSelectedWorkspace(workspace);
    setLoading(true);
    try {
      const data = await apiCall(serverIp, token, 'GET', `/api/workspaces/${workspace.id}/status`);
      setWorkspaceStatus(data);
      setScreen('detail');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to read repository status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshWorkspaceStatus = async () => {
    if (!selectedWorkspace) return;
    setLoading(true);
    try {
      const data = await apiCall(serverIp, token, 'GET', `/api/workspaces/${selectedWorkspace.id}/status`);
      setWorkspaceStatus(data);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to refresh status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleStageFile = async (filePath: string, currentStaged: boolean) => {
    if (!selectedWorkspace) return;
    try {
      await apiCall(serverIp, token, 'POST', `/api/workspaces/${selectedWorkspace.id}/stage`, {
        files: [filePath],
        stage: !currentStaged
      });
      await refreshWorkspaceStatus();
    } catch (err: any) {
      Alert.alert('Staging Failed', err.message);
    }
  };

  const toggleAllFiles = async (stageAll: boolean) => {
    if (!selectedWorkspace || !workspaceStatus) return;
    const targetFiles = workspaceStatus.files
      .filter((f: any) => f.staged !== stageAll)
      .map((f: any) => f.path);

    if (targetFiles.length === 0) return;

    setLoading(true);
    try {
      await apiCall(serverIp, token, 'POST', `/api/workspaces/${selectedWorkspace.id}/stage`, {
        files: targetFiles,
        stage: stageAll
      });
      await refreshWorkspaceStatus();
    } catch (err: any) {
      Alert.alert('Action Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const viewDiff = async (filePath: string, staged: boolean) => {
    if (!selectedWorkspace) return;
    setLoading(true);
    try {
      const data = await apiCall(serverIp, token, 'GET', `/api/workspaces/${selectedWorkspace.id}/diff?file=${encodeURIComponent(filePath)}&staged=${staged}`);
      setDiffFile(filePath);
      setDiffContent(data.diff);
      setDiffIsStaged(staged);
      setDiffVisible(true);
    } catch (err: any) {
      Alert.alert('Diff Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!selectedWorkspace) return;
    if (!commitMessage.trim()) {
      Alert.alert('Error', 'Please enter a commit message.');
      return;
    }

    setLoading(true);
    try {
      await apiCall(serverIp, token, 'POST', `/api/workspaces/${selectedWorkspace.id}/commit`, {
        message: commitMessage.trim()
      });
      setCommitMessage('');
      Alert.alert('Commit Success', 'Changes committed successfully!');
      await refreshWorkspaceStatus();
    } catch (err: any) {
      Alert.alert('Commit Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePush = async () => {
    if (!selectedWorkspace) return;
    setLoading(true);
    try {
      const data = await apiCall(serverIp, token, 'POST', `/api/workspaces/${selectedWorkspace.id}/push`);
      setConsoleOutput(data.output || 'Push executed successfully. (Empty logs)');
      setConsoleVisible(true);
      await refreshWorkspaceStatus();
    } catch (err: any) {
      Alert.alert('Push Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- GITHUB CLOUD METHOD HANDLERS ---
  const handleGithubPair = async () => {
    if (!githubToken.trim()) {
      Alert.alert('Error', 'Please enter a GitHub Personal Access Token (PAT).');
      return;
    }
    setLoading(true);
    try {
      await AsyncStorage.setItem('github_token', githubToken.trim());
      await AsyncStorage.setItem('connection_mode', 'github');
      setGithubIsPaired(true);
      setScreen('github-repos');
      await fetchGithubRepos(githubToken.trim());
    } catch (err: any) {
      Alert.alert('Pairing Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGithubRepos = async (authToken = githubToken) => {
    setLoading(true);
    try {
      const url = `https://api.github.com/user/repos?sort=updated&per_page=50`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${authToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitMobileToPC'
        }
      });
      if (!response.ok) throw new Error(`GitHub responded with status ${response.status}`);
      const data = await response.json();
      setGithubRepos(data);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to retrieve GitHub repositories: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openGithubRepo = async (repo: any) => {
    setGithubSelectedRepo(repo);
    setGithubPathStack([]);
    await fetchGithubContents(repo, []);
  };

  const fetchGithubContents = async (repo: any, pathStack: string[]) => {
    setLoading(true);
    try {
      const pathStr = pathStack.join('/');
      const url = `https://api.github.com/repos/${repo.owner.login}/${repo.name}/contents/${pathStr}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitMobileToPC'
        }
      });
      if (!response.ok) throw new Error(`GitHub contents fetch failed: ${response.status}`);
      const data = await response.json();
      
      const sorted = Array.isArray(data) ? data.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'dir' ? -1 : 1;
      }) : [];

      setGithubContents(sorted);
      setScreen('github-tree');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to read repository contents: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectoryPress = async (dirName: string) => {
    const newStack = [...githubPathStack, dirName];
    setGithubPathStack(newStack);
    await fetchGithubContents(githubSelectedRepo, newStack);
  };

  const handleDirectoryBack = async () => {
    const newStack = [...githubPathStack];
    newStack.pop();
    setGithubPathStack(newStack);
    await fetchGithubContents(githubSelectedRepo, newStack);
  };

  const openGithubFile = async (file: any) => {
    setLoading(true);
    try {
      const response = await fetch(file.url, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitMobileToPC'
        }
      });
      if (!response.ok) throw new Error(`Failed to load file metadata: ${response.status}`);
      const data = await response.json();
      const decoded = decodeBase64(data.content);
      
      setGithubSelectedFile(file);
      setGithubFileContent(decoded);
      setGithubFileSha(data.sha);
      setGithubIsEditing(false);
      setScreen('github-file');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to retrieve file content: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGithubCommit = async () => {
    if (!githubSelectedRepo || !githubSelectedFile) return;
    if (!githubCommitMessage.trim()) {
      Alert.alert('Error', 'Please write a commit message.');
      return;
    }

    setLoading(true);
    try {
      const base64Content = encodeBase64(githubFileContent);
      const response = await fetch(githubSelectedFile.url, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitMobileToPC'
        },
        body: JSON.stringify({
          message: githubCommitMessage.trim(),
          content: base64Content,
          sha: githubFileSha,
          branch: githubSelectedRepo.default_branch
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `GitHub returned ${response.status}`);
      }
      Alert.alert('Commit Success', 'File updated directly on GitHub repository!');
      setGithubCommitMessage('');
      setGithubIsEditing(false);
      setScreen('github-tree');
      await fetchGithubContents(githubSelectedRepo, githubPathStack);
    } catch (err: any) {
      Alert.alert('Commit Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper: render local git diff lines
  const renderDiffLines = (diffText: string) => {
    if (!diffText || diffText.trim() === '') {
      return <Text style={styles.diffTextNormal}>No changes detected or binary file.</Text>;
    }
    const lines = diffText.split('\n');
    return lines.map((line, idx) => {
      let lineStyle = styles.diffTextNormal;
      let bgStyle = {};
      
      if (line.startsWith('+') && !line.startsWith('+++')) {
        lineStyle = styles.diffTextAdd;
        bgStyle = { backgroundColor: 'rgba(16, 185, 129, 0.12)' };
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        lineStyle = styles.diffTextDelete;
        bgStyle = { backgroundColor: 'rgba(239, 68, 68, 0.12)' };
      } else if (line.startsWith('@@')) {
        lineStyle = styles.diffTextHeader;
        bgStyle = { backgroundColor: 'rgba(59, 130, 246, 0.15)' };
      } else if (line.startsWith('diff') || line.startsWith('index') || line.startsWith('---') || line.startsWith('+++')) {
        lineStyle = styles.diffTextMeta;
        bgStyle = { backgroundColor: '#1E293B' };
      }

      return (
        <View key={idx} style={[styles.diffLineContainer, bgStyle]}>
          <Text style={styles.lineNumber}>{idx + 1}</Text>
          <Text style={lineStyle}>{line}</Text>
        </View>
      );
    });
  };

  // Screen layout render mappings
  const renderConnectScreen = () => (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.modeTabs}>
        <TouchableOpacity 
          style={[styles.modeTabButton, connectionMode === 'pc' ? styles.modeTabActive : {}]}
          onPress={() => setConnectionMode('pc')}
        >
          <Text style={[styles.modeTabText, connectionMode === 'pc' ? styles.modeTabActiveText : {}]}>🖥️ PC Agent</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.modeTabButton, connectionMode === 'github' ? styles.modeTabActive : {}]}
          onPress={() => setConnectionMode('github')}
        >
          <Text style={[styles.modeTabText, connectionMode === 'github' ? styles.modeTabActiveText : {}]}>☁️ GitHub Cloud</Text>
        </TouchableOpacity>
      </View>

      {connectionMode === 'pc' ? (
        <View style={styles.card}>
          <Text style={styles.appTitle}>⚡ PC Local Sync</Text>
          <Text style={styles.subtitle}>Review files and execute commits on your local machine.</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PC Server IP & Port</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 192.168.1.50:3011"
              placeholderTextColor="#6B7280"
              value={serverIp}
              onChangeText={setServerIp}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>4-Digit Pairing Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Check PC terminal console"
              placeholderTextColor="#6B7280"
              value={pairingCode}
              onChangeText={setPairingCode}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handlePair} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <Text style={styles.buttonText}>Connect Local Agent</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.appTitle}>☁️ GitHub Cloud Mode</Text>
          <Text style={styles.subtitle}>Connect directly to GitHub API when your PC is turned off.</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>GitHub Personal Access Token (PAT)</Text>
            <TextInput
              style={styles.input}
              placeholder="Paste token starting with ghp_ or github_pat_"
              placeholderTextColor="#6B7280"
              value={githubToken}
              onChangeText={setGithubToken}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleGithubPair} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <Text style={styles.buttonText}>Authorize GitHub Account</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>💡 Security Notice</Text>
        <Text style={styles.infoText}>Your server pairing keys and GitHub personal access tokens are stored strictly inside your phone's secure local Sandbox. They are never sent to any external server besides GitHub's official REST API.</Text>
      </View>
    </ScrollView>
  );

  const renderWorkspacesScreen = () => {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>📁 Local Projects</Text>
            <Text style={styles.headerSubtitle}>Connected: {serverIp}</Text>
          </View>
          <TouchableOpacity style={styles.outlineButtonDanger} onPress={handleDisconnect}>
            <Text style={styles.buttonTextDanger}>Exit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.listContainer}>
          {workspaces.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No Git projects found in your documents folder.</Text>
              <TouchableOpacity style={styles.outlineButton} onPress={() => fetchWorkspaces()}>
                <Text style={styles.buttonText}>Re-Scan Agent</Text>
              </TouchableOpacity>
            </View>
          ) : (
            workspaces.map((ws) => (
              <TouchableOpacity key={ws.id} style={styles.workspaceItem} onPress={() => openWorkspace(ws)}>
                <View style={styles.workspaceRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.workspaceName}>{ws.name}</Text>
                    <Text style={styles.workspacePath} numberOfLines={1}>{ws.path}</Text>
                  </View>
                  <View style={styles.badgeContainer}>
                    <Text style={styles.branchText}>🌲 {ws.currentBranch}</Text>
                    {ws.changesCount > 0 ? (
                      <View style={styles.dangerBadge}>
                        <Text style={styles.dangerBadgeText}>{ws.changesCount} changes</Text>
                      </View>
                    ) : (
                      <View style={styles.successBadge}>
                        <Text style={styles.successBadgeText}>clean</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.fullWidthButton} onPress={() => fetchWorkspaces()}>
            <Text style={styles.buttonText}>Scan Workspaces</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderWorkspaceDetailScreen = () => {
    if (!selectedWorkspace || !workspaceStatus) return null;

    const stagedFiles = workspaceStatus.files.filter((f: any) => f.staged);
    const unstagedFiles = workspaceStatus.files.filter((f: any) => !f.staged);

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'added':
        case 'untracked':
          return '#10B981';
        case 'deleted':
          return '#EF4444';
        default:
          return '#F59E0B';
      }
    };

    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => setScreen('workspaces')}>
            <Text style={styles.backButtonText}>⬅ Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{selectedWorkspace.name}</Text>
            <Text style={styles.headerSubtitle}>🌲 {workspaceStatus.branch}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionButton} onPress={refreshWorkspaceStatus}>
              <Text style={{ fontSize: 18 }}>🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.pushActionButton, (workspaceStatus.ahead > 0) ? {} : styles.disabledBtn]} 
              onPress={handlePush}
              disabled={workspaceStatus.ahead === 0}
            >
              <Text style={styles.pushActionButtonText}>Push ({workspaceStatus.ahead})</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.listContainer}>
          {workspaceStatus.files.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>🎉 Repository has no changes. Clean status!</Text>
            </View>
          ) : (
            <View>
              {stagedFiles.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Staged Changes ({stagedFiles.length})</Text>
                    <TouchableOpacity onPress={() => toggleAllFiles(false)}>
                      <Text style={styles.sectionLink}>Unstage All</Text>
                    </TouchableOpacity>
                  </View>
                  {stagedFiles.map((file: any) => (
                    <View key={file.path} style={styles.fileRow}>
                      <TouchableOpacity 
                        style={styles.fileCheckbox}
                        onPress={() => toggleStageFile(file.path, true)}
                      >
                        <Text style={styles.checkedBox}>[x]</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={{ flex: 1, paddingVertical: 10 }}
                        onPress={() => viewDiff(file.path, true)}
                      >
                        <Text style={styles.filePathText} numberOfLines={1}>{file.path}</Text>
                        <Text style={[styles.fileStatusText, { color: getStatusColor(file.status) }]}>
                          {file.status}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.diffBadge} onPress={() => viewDiff(file.path, true)}>
                        <Text style={styles.diffBadgeText}>Diff</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {unstagedFiles.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Unstaged Changes ({unstagedFiles.length})</Text>
                    <TouchableOpacity onPress={() => toggleAllFiles(true)}>
                      <Text style={styles.sectionLink}>Stage All</Text>
                    </TouchableOpacity>
                  </View>
                  {unstagedFiles.map((file: any) => (
                    <View key={file.path} style={styles.fileRow}>
                      <TouchableOpacity 
                        style={styles.fileCheckbox}
                        onPress={() => toggleStageFile(file.path, false)}
                      >
                        <Text style={styles.uncheckedBox}>[  ]</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={{ flex: 1, paddingVertical: 10 }}
                        onPress={() => viewDiff(file.path, false)}
                      >
                        <Text style={styles.filePathText} numberOfLines={1}>{file.path}</Text>
                        <Text style={[styles.fileStatusText, { color: getStatusColor(file.status) }]}>
                          {file.status}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.diffBadge} onPress={() => viewDiff(file.path, false)}>
                        <Text style={styles.diffBadgeText}>Diff</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {stagedFiles.length > 0 && (
          <View style={styles.commitBox}>
            <TextInput
              style={styles.commitInput}
              placeholder="Commit message..."
              placeholderTextColor="#6B7280"
              value={commitMessage}
              onChangeText={setCommitMessage}
              multiline
            />
            <TouchableOpacity style={styles.commitButton} onPress={handleCommit}>
              <Text style={styles.commitButtonText}>Commit Staged Changes ({stagedFiles.length})</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    );
  };

  // --- GITHUB CLOUD RENDER SCREENS ---
  const renderGithubReposScreen = () => {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>☁️ GitHub Repositories</Text>
            <Text style={styles.headerSubtitle}>Direct GitHub Cloud Mode</Text>
          </View>
          <TouchableOpacity style={styles.outlineButtonDanger} onPress={handleDisconnect}>
            <Text style={styles.buttonTextDanger}>Exit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.listContainer}>
          {githubRepos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No repositories found or token lacks scopes.</Text>
              <TouchableOpacity style={styles.outlineButton} onPress={() => fetchGithubRepos()}>
                <Text style={styles.buttonText}>Reload</Text>
              </TouchableOpacity>
            </View>
          ) : (
            githubRepos.map((repo) => (
              <TouchableOpacity key={repo.id} style={styles.workspaceItem} onPress={() => openGithubRepo(repo)}>
                <View style={styles.workspaceRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.workspaceName}>{repo.name}</Text>
                    <Text style={styles.workspacePath} numberOfLines={1}>{repo.owner.login}</Text>
                  </View>
                  <View style={styles.badgeContainer}>
                    <Text style={styles.branchText}>🌲 {repo.default_branch}</Text>
                    <View style={styles.successBadge}>
                      <Text style={styles.successBadgeText}>{repo.private ? 'Private' : 'Public'}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.fullWidthButton} onPress={() => fetchGithubRepos()}>
            <Text style={styles.buttonText}>Refresh List</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderGithubTreeScreen = () => {
    if (!githubSelectedRepo) return null;
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => {
            if (githubPathStack.length > 0) {
              handleDirectoryBack();
            } else {
              setScreen('github-repos');
              setGithubSelectedRepo(null);
            }
          }}>
            <Text style={styles.backButtonText}>
              {githubPathStack.length > 0 ? '⬅ Back' : '⬅ Repos'}
            </Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{githubSelectedRepo.name}</Text>
            <Text style={styles.headerSubtitle}>
              /{githubPathStack.join('/')} ({githubSelectedRepo.default_branch})
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.listContainer}>
          {githubContents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Empty directory folder.</Text>
            </View>
          ) : (
            githubContents.map((item) => (
              <TouchableOpacity
                key={item.sha}
                style={styles.fileRow}
                onPress={() => {
                  if (item.type === 'dir') {
                    handleDirectoryPress(item.name);
                  } else {
                    openGithubFile(item);
                  }
                }}
              >
                <View style={{ flex: 1, paddingVertical: 14 }}>
                  <Text style={styles.filePathText}>
                    {item.type === 'dir' ? '📁 ' : '📄 '}
                    {item.name}
                  </Text>
                </View>
                {item.type === 'file' && (
                  <View style={styles.diffBadge}>
                    <Text style={styles.diffBadgeText}>Open</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  const renderGithubFileScreen = () => {
    if (!githubSelectedRepo || !githubSelectedFile) return null;
    return (
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => setScreen('github-tree')}>
            <Text style={styles.backButtonText}>⬅ Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{githubSelectedFile.name}</Text>
            <Text style={styles.headerSubtitle}>
              Size: {(githubSelectedFile.size / 1024).toFixed(2)} KB
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.pushActionButton}
            onPress={() => setGithubIsEditing(!githubIsEditing)}
          >
            <Text style={styles.pushActionButtonText}>
              {githubIsEditing ? 'View Mode' : 'Edit Code'}
            </Text>
          </TouchableOpacity>
        </View>

        {githubIsEditing ? (
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.codeEditor}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              value={githubFileContent}
              onChangeText={setGithubFileContent}
            />
            <View style={styles.commitBox}>
              <TextInput
                style={styles.commitInput}
                placeholder="Commit message (e.g. fix: update layout)"
                placeholderTextColor="#6B7280"
                value={githubCommitMessage}
                onChangeText={setGithubCommitMessage}
                multiline
              />
              <TouchableOpacity style={styles.commitButton} onPress={handleGithubCommit}>
                <Text style={styles.commitButtonText}>Commit directly to GitHub</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <ScrollView style={styles.diffScroll}>
            <View style={styles.diffCodeWrapper}>
              {githubFileContent.split('\n').map((line, idx) => (
                <View key={idx} style={styles.diffLineContainer}>
                  <Text style={styles.lineNumber}>{idx + 1}</Text>
                  <Text style={styles.diffTextNormal}>{line}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
      
      {screen === 'connect' && renderConnectScreen()}
      {screen === 'workspaces' && renderWorkspacesScreen()}
      {screen === 'detail' && renderWorkspaceDetailScreen()}
      {screen === 'github-repos' && renderGithubReposScreen()}
      {screen === 'github-tree' && renderGithubTreeScreen()}
      {screen === 'github-file' && renderGithubFileScreen()}

      {/* PC MODE DIFF PANEL */}
      <Modal
        visible={diffVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setDiffVisible(false)}
      >
        <SafeAreaView style={styles.diffContainer}>
          <View style={styles.diffHeader}>
            <TouchableOpacity style={styles.backButton} onPress={() => setDiffVisible(false)}>
              <Text style={styles.backButtonText}>Close</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.diffHeaderTitle} numberOfLines={1}>{diffFile}</Text>
              <Text style={styles.diffHeaderSubtitle}>
                {diffIsStaged ? 'Staged Changes' : 'Unstaged Changes'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.stageToggleBtn}
              onPress={async () => {
                await toggleStageFile(diffFile, diffIsStaged);
                setDiffIsStaged(!diffIsStaged);
                try {
                  const data = await apiCall(serverIp, token, 'GET', `/api/workspaces/${selectedWorkspace.id}/diff?file=${encodeURIComponent(diffFile)}&staged=${!diffIsStaged}`);
                  setDiffContent(data.diff);
                } catch (e) {
                  setDiffContent('Failed to load updated diff');
                }
              }}
            >
              <Text style={styles.stageToggleBtnText}>
                {diffIsStaged ? 'Unstage' : 'Stage'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.diffScroll} horizontal={true}>
            <ScrollView style={styles.diffScroll}>
              <View style={styles.diffCodeWrapper}>
                {renderDiffLines(diffContent)}
              </View>
            </ScrollView>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* TERMINAL MODAL PANEL */}
      <Modal
        visible={consoleVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setConsoleVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Git Pushing Console</Text>
              <TouchableOpacity onPress={() => setConsoleVisible(false)}>
                <Text style={styles.modalCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.consoleBody}>
              <Text style={styles.consoleText}>{consoleOutput}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.globalLoader}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#161D30',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  modeTabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  modeTabActive: {
    backgroundColor: '#1E293B',
    borderColor: '#3B82F6',
  },
  modeTabText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  modeTabActiveText: {
    color: '#3B82F6',
  },
  scrollContainer: {
    padding: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  card: {
    backgroundColor: '#161D30',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1F2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#F9FAFB',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0B0F19',
    borderRadius: 8,
    color: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  primaryButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 15,
  },
  infoCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#1F2937',
    backgroundColor: '#161D30',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F9FAFB',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    padding: 8,
    marginRight: 10,
  },
  pushActionButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pushActionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  outlineButton: {
    borderColor: '#3B82F6',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  outlineButtonDanger: {
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  buttonTextDanger: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  workspaceItem: {
    backgroundColor: '#161D30',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  workspaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workspaceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F9FAFB',
  },
  workspacePath: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  badgeContainer: {
    alignItems: 'flex-end',
  },
  branchText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  dangerBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 6,
  },
  dangerBadgeText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: 'bold',
  },
  successBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 6,
  },
  successBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  bottomBar: {
    backgroundColor: '#161D30',
    borderTopWidth: 1,
    borderColor: '#1F2937',
    padding: 16,
  },
  fullWidthButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#3B82F6',
    fontWeight: 'bold',
    fontSize: 15,
  },
  disabledBtn: {
    backgroundColor: '#1F2937',
    opacity: 0.5,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#1F2937',
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  sectionLink: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161D30',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  fileCheckbox: {
    marginRight: 12,
  },
  checkedBox: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: 'bold',
  },
  uncheckedBox: {
    color: '#4B5563',
    fontSize: 16,
  },
  filePathText: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '500',
  },
  fileStatusText: {
    fontSize: 11,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  diffBadge: {
    backgroundColor: '#1F2937',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  diffBadgeText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
  },
  commitBox: {
    backgroundColor: '#161D30',
    borderTopWidth: 1,
    borderColor: '#1F2937',
    padding: 16,
  },
  commitInput: {
    backgroundColor: '#0B0F19',
    borderRadius: 8,
    color: '#F9FAFB',
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  commitButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  commitButtonText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 14,
  },
  codeEditor: {
    flex: 1,
    backgroundColor: '#05070F',
    color: '#10B981',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13,
    padding: 16,
    textAlignVertical: 'top',
  },
  // DIFF PANEL MODAL STYLES
  diffContainer: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  diffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#1F2937',
    backgroundColor: '#161D30',
  },
  diffHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F9FAFB',
  },
  diffHeaderSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  stageToggleBtn: {
    backgroundColor: '#10B981',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stageToggleBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: 'bold',
  },
  diffScroll: {
    flex: 1,
  },
  diffCodeWrapper: {
    paddingVertical: 12,
  },
  diffLineContainer: {
    flexDirection: 'row',
    paddingRight: 20,
    paddingVertical: 1,
  },
  lineNumber: {
    width: 35,
    textAlign: 'right',
    fontSize: 10,
    color: '#4B5563',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginRight: 10,
    userSelect: 'none',
  },
  diffTextNormal: {
    color: '#E5E7EB',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  diffTextAdd: {
    color: '#10B981',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  diffTextDelete: {
    color: '#EF4444',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  diffTextHeader: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  diffTextMeta: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  // TERMINAL OVERLAY PANEL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#161D30',
    borderRadius: 12,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#1F2937',
    paddingBottom: 10,
    marginBottom: 12,
  },
  modalTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCloseText: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  consoleBody: {
    backgroundColor: '#0B0F19',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  consoleText: {
    color: '#10B981',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  globalLoader: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 15, 25, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
