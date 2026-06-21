import React, { useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Utilities & Components
import { COLORS } from './src/utils/theme';
import { Loader } from './src/components/Loader';
import { DiffViewer } from './src/components/DiffViewer';
import { PushConsole } from './src/components/PushConsole';

// Custom Hooks
import { usePCAgent } from './src/hooks/usePCAgent';
import { useGithubCloud } from './src/hooks/useGithubCloud';

// Screens
import { ConnectScreen } from './src/screens/ConnectScreen';
import { WorkspaceListScreen } from './src/screens/WorkspaceListScreen';
import { WorkspaceDetailScreen } from './src/screens/WorkspaceDetailScreen';
import { GithubRepoScreen } from './src/screens/GithubRepoScreen';
import { GithubTreeScreen } from './src/screens/GithubTreeScreen';
import { GithubFileScreen } from './src/screens/GithubFileScreen';
import { LocalFileScreen } from './src/screens/LocalFileScreen';

export default function App() {
  const [connectionMode, setConnectionMode] = useState<'pc' | 'github'>('pc');
  const [screen, setScreen] = useState('connect');

  // PC Mode States/Hooks
  const pcAgent = usePCAgent();
  const [diffVisible, setDiffVisible] = useState(false);
  const [diffFile, setDiffFile] = useState('');
  const [diffContent, setDiffContent] = useState('');
  const [diffIsStaged, setDiffIsStaged] = useState(false);
  const [consoleVisible, setConsoleVisible] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState('');

  // GitHub Mode Hooks
  const github = useGithubCloud();

  // Load saved connection configurations on launch
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
        github.setGithubToken(savedGithubToken);
        github.setGithubIsPaired(true);
        setScreen('github-repos');
        await github.fetchGithubRepos(savedGithubToken);
      } else if (savedIp && savedToken) {
        setConnectionMode('pc');
        pcAgent.setServerIp(savedIp);
        pcAgent.setToken(savedToken);
        pcAgent.setIsPaired(true);
        setScreen('workspaces');
        await pcAgent.loadWorkspaces(savedIp, savedToken);
      } else {
        if (savedIp) pcAgent.setServerIp(savedIp);
        if (savedGithubToken) github.setGithubToken(savedGithubToken);
      }
    } catch (e) {
      console.log('Error loading saved connections', e);
    }
  };

  // PC mode handlers
  const handlePCScreenBack = () => {
    setScreen('workspaces');
    pcAgent.setSelectedWorkspace(null);
    pcAgent.setWorkspaceStatus(null);
  };

  const handlePCDisconnect = async () => {
    await pcAgent.disconnectAgent();
    setScreen('connect');
  };

  const handlePCOpenWorkspace = async (ws: any) => {
    const status = await pcAgent.openWorkspace(ws);
    if (status) {
      // Reset local file tree stack on opening a workspace
      pcAgent.setLocalPathStack([]);
      setScreen('detail');
    }
  };

  const handleOpenLocalFile = async (file: any) => {
    const content = await pcAgent.openLocalFile(file);
    if (content !== null) {
      setScreen('local-file');
    }
  };

  const handlePCViewDiff = async (filePath: string, staged: boolean) => {
    const diff = await pcAgent.loadDiff(filePath, staged);
    setDiffFile(filePath);
    setDiffContent(diff);
    setDiffIsStaged(staged);
    setDiffVisible(true);
  };

  const handlePCToggleDiffStaged = async () => {
    await pcAgent.toggleStageFile(diffFile, diffIsStaged);
    const newStaged = !diffIsStaged;
    setDiffIsStaged(newStaged);
    // Reload diff
    const updatedDiff = await pcAgent.loadDiff(diffFile, newStaged);
    setDiffContent(updatedDiff);
  };

  const handlePCPush = async () => {
    const logs = await pcAgent.pushChanges();
    if (logs) {
      setConsoleOutput(logs);
      setConsoleVisible(true);
    }
  };

  const handlePCPull = async () => {
    const logs = await pcAgent.pullChanges();
    if (logs) {
      setConsoleOutput(logs);
      setConsoleVisible(true);
    }
  };

  // Github Mode handlers
  const handleGithubDisconnect = async () => {
    await github.disconnectGithub();
    setScreen('connect');
  };

  const handleGithubOpenRepo = async (repo: any) => {
    await github.openGithubRepo(repo);
    setScreen('github-tree');
  };

  const handleGithubFileOpen = async (file: any) => {
    const content = await github.openGithubFile(file);
    if (content !== null) {
      setScreen('github-file');
    }
  };

  // Determine current active loading state
  const isGlobalLoading = pcAgent.loading || github.loading;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Screen Routing */}
      {screen === 'connect' && (
        <ConnectScreen
          connectionMode={connectionMode}
          setConnectionMode={setConnectionMode}
          serverIp={pcAgent.serverIp}
          setServerIp={pcAgent.setServerIp}
          pairingCode={pcAgent.pairingCode}
          setPairingCode={pcAgent.setPairingCode}
          githubToken={github.githubToken}
          setGithubToken={github.setGithubToken}
          loading={isGlobalLoading}
          scanProgress={pcAgent.scanProgress}
          onPairAgent={async (ip, code) => {
            const success = await pcAgent.pairAgent(ip, code);
            if (success) setScreen('workspaces');
            return success;
          }}
          onAuthorizeGithub={async (token) => {
            const success = await github.authorizeGithub(token);
            if (success) setScreen('github-repos');
            return success;
          }}
          onDiscoverAgent={pcAgent.discoverAgent}
        />
      )}

      {screen === 'workspaces' && (
        <WorkspaceListScreen
          serverIp={pcAgent.serverIp}
          workspaces={pcAgent.workspaces}
          onDisconnect={handlePCDisconnect}
          onRefresh={() => pcAgent.loadWorkspaces()}
          onOpenWorkspace={handlePCOpenWorkspace}
        />
      )}

      {screen === 'detail' && (
        <WorkspaceDetailScreen
          selectedWorkspace={pcAgent.selectedWorkspace}
          workspaceStatus={pcAgent.workspaceStatus}
          commitMessage={pcAgent.commitMessage}
          setCommitMessage={pcAgent.setCommitMessage}
          onBack={handlePCScreenBack}
          onRefresh={pcAgent.refreshWorkspaceStatus}
          onPush={handlePCPush}
          onPull={handlePCPull}
          onToggleStageFile={pcAgent.toggleStageFile}
          onToggleAllFiles={pcAgent.toggleAllFiles}
          onViewDiff={handlePCViewDiff}
          onCommit={pcAgent.commitChanges}
          localPathStack={pcAgent.localPathStack}
          localContents={pcAgent.localContents}
          onLoadLocalContents={() => pcAgent.loadLocalContents()}
          onLocalDirPress={pcAgent.handleLocalDirPress}
          onLocalDirBack={pcAgent.handleLocalDirBack}
          onOpenLocalFile={handleOpenLocalFile}
          localCommits={pcAgent.localCommits}
          onLoadLocalCommits={() => pcAgent.loadLocalCommits()}
        />
      )}

      {screen === 'local-file' && (
        <LocalFileScreen
          selectedWorkspace={pcAgent.selectedWorkspace}
          localSelectedFile={pcAgent.localSelectedFile}
          localFileContent={pcAgent.localFileContent}
          setLocalFileContent={pcAgent.setLocalFileContent}
          localCommitMessage={pcAgent.localCommitMessage}
          setLocalCommitMessage={pcAgent.setLocalCommitMessage}
          localIsEditing={pcAgent.localIsEditing}
          setLocalIsEditing={pcAgent.setLocalIsEditing}
          onBack={() => setScreen('detail')}
          onCommit={async (msg) => {
            const success = await pcAgent.commitLocalFileChanges(msg);
            if (success) setScreen('detail');
            return success;
          }}
        />
      )}

      {screen === 'github-repos' && (
        <GithubRepoScreen
          githubRepos={github.githubRepos}
          onDisconnect={handleGithubDisconnect}
          onRefresh={() => github.fetchGithubRepos()}
          onOpenRepo={handleGithubOpenRepo}
        />
      )}

      {screen === 'github-tree' && (
        <GithubTreeScreen
          githubSelectedRepo={github.githubSelectedRepo}
          githubPathStack={github.githubPathStack}
          githubContents={github.githubContents}
          onDirectoryPress={github.handleDirectoryPress}
          onDirectoryBack={github.handleDirectoryBack}
          onOpenRepoScreen={() => setScreen('github-repos')}
          onOpenFile={handleGithubFileOpen}
        />
      )}

      {screen === 'github-file' && (
        <GithubFileScreen
          githubSelectedRepo={github.githubSelectedRepo}
          githubSelectedFile={github.githubSelectedFile}
          githubFileContent={github.githubFileContent}
          setGithubFileContent={github.setGithubFileContent}
          githubCommitMessage={github.githubCommitMessage}
          setGithubCommitMessage={github.setGithubCommitMessage}
          githubIsEditing={github.githubIsEditing}
          setGithubIsEditing={github.setGithubIsEditing}
          onBack={() => setScreen('github-tree')}
          onCommit={async (msg) => {
            const success = await github.commitGithubFile(msg);
            if (success) setScreen('github-tree');
            return success;
          }}
        />
      )}

      {/* PC MODE DIFF PANEL MODAL */}
      <DiffViewer
        visible={diffVisible}
        onClose={() => setDiffVisible(false)}
        file={diffFile}
        diff={diffContent}
        isStaged={diffIsStaged}
        onToggleStage={handlePCToggleDiffStaged}
      />

      {/* PUSH LOGS CONSOLE TERMINAL MODAL */}
      <PushConsole
        visible={consoleVisible}
        onClose={() => setConsoleVisible(false)}
        output={consoleOutput}
      />

      {/* GLOBAL LOADING SPINNER MODAL */}
      <Loader visible={isGlobalLoading} message={pcAgent.scanProgress || 'Processing...'} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
