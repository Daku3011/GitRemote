import { useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiCall } from '../utils/api';

export const usePCAgent = () => {
  const [serverIp, setServerIp] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [token, setToken] = useState('');
  const [isPaired, setIsPaired] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<any>(null);
  const [workspaceStatus, setWorkspaceStatus] = useState<any>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState('');

  // Local File System Traversal States
  const [localPathStack, setLocalPathStack] = useState<string[]>([]);
  const [localContents, setLocalContents] = useState<any[]>([]);
  const [localSelectedFile, setLocalSelectedFile] = useState<any>(null);
  const [localFileContent, setLocalFileContent] = useState('');
  const [localCommitMessage, setLocalCommitMessage] = useState('');
  const [localIsEditing, setLocalIsEditing] = useState(false);
  const [localCommits, setLocalCommits] = useState<any[]>([]);

  // Pair with PC Agent
  const pairAgent = async (ip: string, code: string) => {
    if (!ip) {
      Alert.alert('Error', 'Please enter your PC IP address & port (e.g. 192.168.1.50:3011)');
      return false;
    }
    if (!code) {
      Alert.alert('Error', 'Please enter the 4-digit pairing code shown in the PC server console.');
      return false;
    }

    setLoading(true);
    try {
      const data = await apiCall(ip.trim(), '', 'POST', '/api/pair', { code: code.trim() });
      const newToken = data.token;
      
      await AsyncStorage.setItem('server_ip', ip.trim());
      await AsyncStorage.setItem('auth_token', newToken);
      await AsyncStorage.setItem('connection_mode', 'pc');
      
      setServerIp(ip.trim());
      setToken(newToken);
      setIsPaired(true);
      
      // Fetch workspaces immediately after pairing
      await loadWorkspaces(ip.trim(), newToken);
      return true;
    } catch (err: any) {
      Alert.alert('Pairing Failed', err.message || 'Could not connect to PC Agent. Check the IP and make sure the server is running.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // List all repositories
  const loadWorkspaces = async (targetIp = serverIp, authToken = token) => {
    setLoading(true);
    try {
      const data = await apiCall(targetIp, authToken, 'GET', '/api/workspaces');
      setWorkspaces(data);
      return data;
    } catch (err: any) {
      Alert.alert('Fetch Failed', 'Failed to retrieve projects. Check connection to server.');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Open detailed view of repository
  const openWorkspace = async (workspace: any) => {
    setSelectedWorkspace(workspace);
    setLoading(true);
    try {
      const data = await apiCall(serverIp, token, 'GET', `/api/workspaces/${workspace.id}/status`);
      setWorkspaceStatus(data);
      return data;
    } catch (err: any) {
      Alert.alert('Error', 'Failed to read repository status: ' + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Refresh status of repository
  const refreshWorkspaceStatus = async () => {
    if (!selectedWorkspace) return;
    setLoading(true);
    try {
      const data = await apiCall(serverIp, token, 'GET', `/api/workspaces/${selectedWorkspace.id}/status`);
      setWorkspaceStatus(data);
      return data;
    } catch (err: any) {
      Alert.alert('Error', 'Failed to refresh status: ' + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Toggle stage/unstage file
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

  // Stage or unstage all files
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

  // Fetch unified diff
  const loadDiff = async (filePath: string, staged: boolean) => {
    if (!selectedWorkspace) return '';
    setLoading(true);
    try {
      const data = await apiCall(
        serverIp,
        token,
        'GET',
        `/api/workspaces/${selectedWorkspace.id}/diff?file=${encodeURIComponent(filePath)}&staged=${staged}`
      );
      return data.diff;
    } catch (err: any) {
      Alert.alert('Diff Failed', err.message);
      return '';
    } finally {
      setLoading(false);
    }
  };

  // Fetch local repository directory/file entries
  const loadLocalContents = async (repoId = selectedWorkspace?.id, pathStack = localPathStack) => {
    if (!repoId) return;
    setLoading(true);
    try {
      const subpath = pathStack.join('/');
      const data = await apiCall(
        serverIp,
        token,
        'GET',
        `/api/workspaces/${repoId}/contents?path=${encodeURIComponent(subpath)}`
      );
      if (data.type === 'dir') {
        setLocalContents(data.entries);
      }
      return data;
    } catch (err: any) {
      Alert.alert('Read Failed', 'Failed to retrieve repository contents: ' + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Navigate folder down
  const handleLocalDirPress = async (dirName: string) => {
    const newStack = [...localPathStack, dirName];
    setLocalPathStack(newStack);
    await loadLocalContents(selectedWorkspace.id, newStack);
  };

  // Navigate folder up
  const handleLocalDirBack = async () => {
    const newStack = [...localPathStack];
    newStack.pop();
    setLocalPathStack(newStack);
    await loadLocalContents(selectedWorkspace.id, newStack);
  };

  // Open local file for viewing
  const openLocalFile = async (file: any) => {
    setLoading(true);
    try {
      const data = await apiCall(
        serverIp,
        token,
        'GET',
        `/api/workspaces/${selectedWorkspace.id}/contents?path=${encodeURIComponent(file.path)}`
      );
      setLocalSelectedFile(file);
      setLocalFileContent(data.content);
      setLocalIsEditing(false);
      setLocalCommitMessage('');
      return data.content;
    } catch (err: any) {
      Alert.alert('Read Failed', 'Failed to retrieve file content: ' + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Write changes to a local file and commit
  const commitLocalFileChanges = async (message: string) => {
    if (!selectedWorkspace || !localSelectedFile) return false;
    if (!message.trim()) {
      Alert.alert('Error', 'Please write a commit message.');
      return false;
    }

    setLoading(true);
    try {
      await apiCall(serverIp, token, 'POST', `/api/workspaces/${selectedWorkspace.id}/write`, {
        path: localSelectedFile.path,
        content: localFileContent,
        message: message.trim()
      });
      Alert.alert('Commit Success', 'File written and committed successfully!');
      setLocalCommitMessage('');
      setLocalIsEditing(false);
      await loadLocalContents(selectedWorkspace.id, localPathStack);
      await refreshWorkspaceStatus();
      await loadLocalCommits(); // Refresh commit logs
      return true;
    } catch (err: any) {
      Alert.alert('Commit Failed', err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Fetch local repository commit history logs
  const loadLocalCommits = async (repoId = selectedWorkspace?.id) => {
    if (!repoId) return [];
    setLoading(true);
    try {
      const data = await apiCall(serverIp, token, 'GET', `/api/workspaces/${repoId}/log`);
      const commitsList = Array.isArray(data) ? data : [];
      setLocalCommits(commitsList);
      return commitsList;
    } catch (err: any) {
      Alert.alert('Log Failed', 'Failed to retrieve repository history: ' + err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Pull changes from origin remote
  const pullChanges = async () => {
    if (!selectedWorkspace) return '';
    setLoading(true);
    try {
      const data = await apiCall(serverIp, token, 'POST', `/api/workspaces/${selectedWorkspace.id}/pull`);
      await refreshWorkspaceStatus();
      await loadLocalCommits(); // Refresh history
      return data.output || 'Pull completed. (No logs returned)';
    } catch (err: any) {
      Alert.alert('Pull Failed', err.message);
      return '';
    } finally {
      setLoading(false);
    }
  };

  // Commit changes
  const commitChanges = async (message: string) => {
    if (!selectedWorkspace) return false;
    setLoading(true);
    try {
      await apiCall(serverIp, token, 'POST', `/api/workspaces/${selectedWorkspace.id}/commit`, {
        message: message.trim()
      });
      setCommitMessage('');
      await refreshWorkspaceStatus();
      return true;
    } catch (err: any) {
      Alert.alert('Commit Failed', err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Push committed changes
  const pushChanges = async () => {
    if (!selectedWorkspace) return '';
    setLoading(true);
    try {
      const data = await apiCall(serverIp, token, 'POST', `/api/workspaces/${selectedWorkspace.id}/push`);
      await refreshWorkspaceStatus();
      return data.output || 'Push completed. (No logs returned)';
    } catch (err: any) {
      Alert.alert('Push Failed', err.message);
      return '';
    } finally {
      setLoading(false);
    }
  };

  // Disconnect pairing
  const disconnectAgent = async () => {
    await AsyncStorage.removeItem('server_ip');
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('connection_mode');
    
    setServerIp('');
    setToken('');
    setIsPaired(false);
    setWorkspaces([]);
    setSelectedWorkspace(null);
    setWorkspaceStatus(null);
  };

  // Auto-discover scan subnet pings
  const discoverAgent = async (currentIpInput: string): Promise<string | null> => {
    setLoading(true);
    setScanProgress('Initializing network scan...');
    
    // Guess base subnet: check user entered IP, otherwise standard IP classes
    let baseSubnet = '192.168.1';
    let port = '3011';
    
    if (currentIpInput && currentIpInput.includes('.')) {
      const parts = currentIpInput.split(':');
      const ipParts = parts[0].split('.');
      if (ipParts.length >= 3) {
        baseSubnet = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
      }
      if (parts[1]) port = parts[1];
    }
    
    // Scan range 1 to 254 in parallel batches of 30 pings to prevent thread exhaustion
    const batchSize = 30;
    let foundIp: string | null = null;
    
    for (let i = 1; i <= 254; i += batchSize) {
      if (foundIp) break;
      const end = Math.min(i + batchSize - 1, 254);
      setScanProgress(`Scanning subnet ${baseSubnet}.[${i}-${end}] on port ${port}...`);
      
      const pingPromises = [];
      for (let j = i; j <= end; j++) {
        const ip = `${baseSubnet}.${j}:${port}`;
        pingPromises.push(
          (async () => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 600); // Quick 600ms ping timeout
            try {
              const url = `http://${ip}/api/pair`;
              const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: '9999' }), // dummy code just to see if we get a response
                signal: controller.signal
              });
              clearTimeout(timer);
              // If it returns 400 (Invalid pairing code) or 200, it means a GitRemote agent is running!
              if (response.status === 400 || response.status === 200) {
                foundIp = ip;
              }
            } catch (e) {
              clearTimeout(timer);
            }
          })()
        );
      }
      
      await Promise.all(pingPromises);
    }
    
    setLoading(false);
    setScanProgress('');
    
    if (foundIp) {
      setServerIp(foundIp);
      Alert.alert('Agent Found', `Detected GitRemote companion agent running at ${foundIp}!`);
      return foundIp;
    } else {
      Alert.alert(
        'Scan Failed',
        `No GitRemote agent found on subnet ${baseSubnet}.0/24. Check firewall settings, port configuration, or verify you are on the same Wi-Fi network.`
      );
      return null;
    }
  };

  return {
    serverIp,
    setServerIp,
    pairingCode,
    setPairingCode,
    token,
    setToken,
    isPaired,
    setIsPaired,
    workspaces,
    selectedWorkspace,
    setSelectedWorkspace,
    workspaceStatus,
    setWorkspaceStatus,
    commitMessage,
    setCommitMessage,
    loading,
    setLoading,
    scanProgress,
    localPathStack,
    setLocalPathStack,
    localContents,
    localSelectedFile,
    setLocalSelectedFile,
    localFileContent,
    setLocalFileContent,
    localCommitMessage,
    setLocalCommitMessage,
    localIsEditing,
    setLocalIsEditing,
    localCommits,
    setLocalCommits,
    pairAgent,
    loadWorkspaces,
    openWorkspace,
    refreshWorkspaceStatus,
    toggleStageFile,
    toggleAllFiles,
    loadDiff,
    loadLocalContents,
    handleLocalDirPress,
    handleLocalDirBack,
    openLocalFile,
    commitLocalFileChanges,
    loadLocalCommits,
    pullChanges,
    commitChanges,
    pushChanges,
    disconnectAgent,
    discoverAgent,
  };
};
