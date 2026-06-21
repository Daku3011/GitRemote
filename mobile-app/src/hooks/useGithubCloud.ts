import { useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeBase64, encodeBase64 } from '../utils/crypto';

export const useGithubCloud = () => {
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
  const [loading, setLoading] = useState(false);

  // Authorize with PAT
  const authorizeGithub = async (token: string) => {
    if (!token.trim()) {
      Alert.alert('Error', 'Please enter a GitHub Personal Access Token (PAT).');
      return false;
    }
    setLoading(true);
    try {
      await AsyncStorage.setItem('github_token', token.trim());
      await AsyncStorage.setItem('connection_mode', 'github');
      setGithubToken(token.trim());
      setGithubIsPaired(true);
      await fetchGithubRepos(token.trim());
      return true;
    } catch (err: any) {
      Alert.alert('Pairing Failed', err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Fetch repositories
  const fetchGithubRepos = async (authToken = githubToken) => {
    setLoading(true);
    try {
      const url = `https://api.github.com/user/repos?sort=updated&per_page=50`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${authToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitRemoteMobile'
        }
      });
      if (!response.ok) throw new Error(`GitHub responded with status ${response.status}`);
      const data = await response.json();
      setGithubRepos(data);
      return data;
    } catch (err: any) {
      Alert.alert('Error', 'Failed to retrieve GitHub repositories: ' + err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Open repository and load contents
  const openGithubRepo = async (repo: any) => {
    setGithubSelectedRepo(repo);
    setGithubPathStack([]);
    await fetchGithubContents(repo, []);
  };

  // Fetch directory contents
  const fetchGithubContents = async (repo = githubSelectedRepo, pathStack = githubPathStack) => {
    if (!repo) return;
    setLoading(true);
    try {
      const pathStr = pathStack.join('/');
      const url = `https://api.github.com/repos/${repo.owner.login}/${repo.name}/contents/${pathStr}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitRemoteMobile'
        }
      });
      if (!response.ok) throw new Error(`GitHub contents fetch failed: ${response.status}`);
      const data = await response.json();
      
      const sorted = Array.isArray(data) ? data.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'dir' ? -1 : 1;
      }) : [];

      setGithubContents(sorted);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to read repository contents: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Navigate folder down
  const handleDirectoryPress = async (dirName: string) => {
    const newStack = [...githubPathStack, dirName];
    setGithubPathStack(newStack);
    await fetchGithubContents(githubSelectedRepo, newStack);
  };

  // Navigate folder up
  const handleDirectoryBack = async () => {
    const newStack = [...githubPathStack];
    newStack.pop();
    setGithubPathStack(newStack);
    await fetchGithubContents(githubSelectedRepo, newStack);
  };

  // Open file for viewing
  const openGithubFile = async (file: any) => {
    setLoading(true);
    try {
      const response = await fetch(file.url, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitRemoteMobile'
        }
      });
      if (!response.ok) throw new Error(`Failed to load file metadata: ${response.status}`);
      const data = await response.json();
      const decoded = decodeBase64(data.content);
      
      setGithubSelectedFile(file);
      setGithubFileContent(decoded);
      setGithubFileSha(data.sha);
      setGithubIsEditing(false);
      return decoded;
    } catch (err: any) {
      Alert.alert('Error', 'Failed to retrieve file content: ' + err.message);
      return '';
    } finally {
      setLoading(false);
    }
  };

  // Commit direct updates to file
  const commitGithubFile = async (message: string) => {
    if (!githubSelectedRepo || !githubSelectedFile) return false;
    if (!message.trim()) {
      Alert.alert('Error', 'Please write a commit message.');
      return false;
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
          'User-Agent': 'GitRemoteMobile'
        },
        body: JSON.stringify({
          message: message.trim(),
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
      await fetchGithubContents(githubSelectedRepo, githubPathStack);
      return true;
    } catch (err: any) {
      Alert.alert('Commit Failed', err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Exit/Disconnect
  const disconnectGithub = async () => {
    await AsyncStorage.removeItem('github_token');
    await AsyncStorage.removeItem('connection_mode');
    
    setGithubToken('');
    setGithubIsPaired(false);
    setGithubRepos([]);
    setGithubSelectedRepo(null);
    setGithubPathStack([]);
    setGithubContents([]);
    setGithubSelectedFile(null);
  };

  return {
    githubToken,
    setGithubToken,
    githubIsPaired,
    setGithubIsPaired,
    githubRepos,
    setGithubRepos,
    githubSelectedRepo,
    setGithubSelectedRepo,
    githubPathStack,
    setGithubPathStack,
    githubContents,
    githubSelectedFile,
    setGithubSelectedFile,
    githubFileContent,
    setGithubFileContent,
    githubFileSha,
    githubCommitMessage,
    setGithubCommitMessage,
    githubIsEditing,
    setGithubIsEditing,
    loading,
    setLoading,
    authorizeGithub,
    fetchGithubRepos,
    openGithubRepo,
    fetchGithubContents,
    handleDirectoryPress,
    handleDirectoryBack,
    openGithubFile,
    commitGithubFile,
    disconnectGithub,
  };
};
export default useGithubCloud;
