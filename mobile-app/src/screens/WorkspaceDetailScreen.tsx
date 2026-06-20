import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import {
  Workspace,
  WorkspaceStatus,
  FileEntry,
  BranchInfo,
  CommitInfo,
  StashInfo,
} from '../types';
import {
  fetchStatus,
  fetchDiff,
  stageFiles,
  commit as commitApi,
  push as pushApi,
  pull as pullApi,
  fetchRemote,
  fetchBranches,
  checkoutBranch,
  deleteBranch,
  fetchLog,
  fetchStashList,
  saveStash,
  popStash,
  dropStash,
} from '../api';
import { s, colors } from '../styles';
import { decodeBase64, encodeBase64 } from '../utils/base64';

interface Props {
  workspace: Workspace;
  serverIp: string;
  token: string;
  onBack: () => void;
}

const renderDiffLines = (diffText: string) => {
  if (!diffText || diffText.trim() === '') {
    return <Text style={s.diffTextNormal}>No changes detected or binary file.</Text>;
  }
  const lines = diffText.split('\n');
  return lines.map((line, idx) => {
    let lineStyle = s.diffTextNormal;
    let bgStyle: any = {};

    if (line.startsWith('+') && !line.startsWith('+++')) {
      lineStyle = s.diffTextAdd;
      bgStyle = { backgroundColor: 'rgba(16, 185, 129, 0.12)' };
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      lineStyle = s.diffTextDelete;
      bgStyle = { backgroundColor: 'rgba(239, 68, 68, 0.12)' };
    } else if (line.startsWith('@@')) {
      lineStyle = s.diffTextHeader;
      bgStyle = { backgroundColor: 'rgba(59, 130, 246, 0.15)' };
    } else if (line.startsWith('diff') || line.startsWith('index') || line.startsWith('---') || line.startsWith('+++')) {
      lineStyle = s.diffTextMeta;
      bgStyle = { backgroundColor: '#1E293B' };
    }

    return (
      <View key={idx} style={[s.diffLineContainer, bgStyle]}>
        <Text style={s.lineNumber}>{idx + 1}</Text>
        <Text style={lineStyle}>{line}</Text>
      </View>
    );
  });
};

export default function WorkspaceDetailScreen({ workspace, serverIp, token, onBack }: Props) {
  const [status, setStatus] = useState<WorkspaceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');

  const [diffVisible, setDiffVisible] = useState(false);
  const [diffFile, setDiffFile] = useState('');
  const [diffContent, setDiffContent] = useState('');
  const [diffIsStaged, setDiffIsStaged] = useState(false);

  const [consoleVisible, setConsoleVisible] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState('');

  const [branchVisible, setBranchVisible] = useState(false);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [currentBranch, setCurrentBranch] = useState('');
  const [newBranchName, setNewBranchName] = useState('');

  const [logVisible, setLogVisible] = useState(false);
  const [logEntries, setLogEntries] = useState<CommitInfo[]>([]);

  const [stashVisible, setStashVisible] = useState(false);
  const [stashEntries, setStashEntries] = useState<StashInfo[]>([]);
  const [stashMessage, setStashMessage] = useState('');

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchStatus(serverIp, token, workspace.id);
      setStatus(data);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load workspace status: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [serverIp, token, workspace.id]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleStageFile = async (filePath: string, currentlyStaged: boolean) => {
    try {
      await stageFiles(serverIp, token, workspace.id, [filePath], !currentlyStaged);
      await loadStatus();
    } catch (err: any) {
      Alert.alert('Staging Failed', err.message);
    }
  };

  const handleStageAll = async (stage: boolean) => {
    if (!status) return;
    const targetFiles = status.files
      .filter((f) => f.staged !== stage)
      .map((f) => f.path);
    if (targetFiles.length === 0) return;
    setLoading(true);
    try {
      await stageFiles(serverIp, token, workspace.id, targetFiles, stage);
      await loadStatus();
    } catch (err: any) {
      Alert.alert('Action Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const viewDiff = async (filePath: string, staged: boolean) => {
    setLoading(true);
    try {
      const data = await fetchDiff(serverIp, token, workspace.id, filePath, staged);
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
    if (!commitMessage.trim()) {
      Alert.alert('Error', 'Please enter a commit message.');
      return;
    }
    setLoading(true);
    try {
      await commitApi(serverIp, token, workspace.id, commitMessage.trim());
      setCommitMessage('');
      Alert.alert('Commit Success', 'Changes committed successfully!');
      await loadStatus();
    } catch (err: any) {
      Alert.alert('Commit Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePush = async () => {
    setLoading(true);
    try {
      const data = await pushApi(serverIp, token, workspace.id);
      setConsoleOutput(data.output || 'Push executed successfully. (Empty logs)');
      setConsoleVisible(true);
      await loadStatus();
    } catch (err: any) {
      Alert.alert('Push Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePull = async () => {
    setLoading(true);
    try {
      const data = await pullApi(serverIp, token, workspace.id);
      setConsoleOutput(data.output || 'Pull executed successfully.');
      setConsoleVisible(true);
      await loadStatus();
    } catch (err: any) {
      Alert.alert('Pull Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetch = async () => {
    setLoading(true);
    try {
      const data = await fetchRemote(serverIp, token, workspace.id);
      setConsoleOutput(data.output || 'Fetch completed.');
      setConsoleVisible(true);
    } catch (err: any) {
      Alert.alert('Fetch Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const openBranches = async () => {
    setLoading(true);
    try {
      const data = await fetchBranches(serverIp, token, workspace.id);
      setBranches(data.branches);
      setCurrentBranch(data.current);
      setNewBranchName('');
      setBranchVisible(true);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load branches: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutBranch = async (branch: string) => {
    setLoading(true);
    try {
      await checkoutBranch(serverIp, token, workspace.id, branch);
      setBranchVisible(false);
      await loadStatus();
    } catch (err: any) {
      Alert.alert('Checkout Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      Alert.alert('Error', 'Please enter a branch name.');
      return;
    }
    setLoading(true);
    try {
      await checkoutBranch(serverIp, token, workspace.id, newBranchName.trim(), true);
      setBranchVisible(false);
      await loadStatus();
    } catch (err: any) {
      Alert.alert('Create Branch Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBranch = (branch: string) => {
    Alert.alert('Delete Branch', `Delete "${branch}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await deleteBranch(serverIp, token, workspace.id, branch);
            const data = await fetchBranches(serverIp, token, workspace.id);
            setBranches(data.branches);
            setCurrentBranch(data.current);
          } catch (err: any) {
            Alert.alert('Delete Failed', err.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const openLog = async () => {
    setLoading(true);
    try {
      const data = await fetchLog(serverIp, token, workspace.id, 20);
      setLogEntries(data.commits || []);
      setLogVisible(true);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load log: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openStash = async () => {
    setLoading(true);
    try {
      const data = await fetchStashList(serverIp, token, workspace.id);
      setStashEntries(data.stashes || []);
      setStashMessage('');
      setStashVisible(true);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load stashes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStash = async () => {
    setLoading(true);
    try {
      await saveStash(serverIp, token, workspace.id, stashMessage.trim() || undefined);
      setStashVisible(false);
      await loadStatus();
    } catch (err: any) {
      Alert.alert('Stash Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePopStash = async () => {
    setLoading(true);
    try {
      const data = await popStash(serverIp, token, workspace.id);
      setConsoleOutput(data.output || 'Stash popped successfully.');
      setConsoleVisible(true);
      setStashVisible(false);
      await loadStatus();
    } catch (err: any) {
      Alert.alert('Pop Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDropStash = () => {
    Alert.alert('Drop Stash', 'Drop the latest stash?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Drop',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await dropStash(serverIp, token, workspace.id);
            const data = await fetchStashList(serverIp, token, workspace.id);
            setStashEntries(data.stashes || []);
          } catch (err: any) {
            Alert.alert('Drop Failed', err.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const getStatusColor = (st: string) => {
    switch (st) {
      case 'added':
      case 'untracked':
        return '#10B981';
      case 'deleted':
        return '#EF4444';
      default:
        return '#F59E0B';
    }
  };

  if (!status) {
    return (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  const stagedFiles = status.files.filter((f) => f.staged);
  const unstagedFiles = status.files.filter((f) => !f.staged);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <TouchableOpacity style={s.backButton} onPress={onBack}>
          <Text style={s.backButtonText}>⬅ Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={s.headerTitle} numberOfLines={1}>{workspace.name}</Text>
          <Text style={s.headerSubtitle}>🌲 {status.branch}</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.headerActionButton} onPress={loadStatus}>
            <Text style={{ fontSize: 18 }}>🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.pushActionButton, status.ahead > 0 ? {} : s.disabledBtn]}
            onPress={handlePush}
            disabled={status.ahead === 0}
          >
            <Text style={s.pushActionButtonText}>Push ({status.ahead})</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[s.pushActionButton, { backgroundColor: colors.border }]} onPress={handlePull}>
            <Text style={s.pushActionButtonText}>Pull{status.behind > 0 ? ` (${status.behind})` : ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.pushActionButton, { backgroundColor: colors.border }]} onPress={handleFetch}>
            <Text style={s.pushActionButtonText}>Fetch</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.pushActionButton, { backgroundColor: colors.border }]} onPress={openBranches}>
            <Text style={s.pushActionButtonText}>Branches</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.pushActionButton, { backgroundColor: colors.border }]} onPress={openLog}>
            <Text style={s.pushActionButtonText}>Log</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.pushActionButton, { backgroundColor: colors.border }]} onPress={openStash}>
            <Text style={s.pushActionButtonText}>Stash</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={s.listContainer}>
        {status.files.length === 0 ? (
          <View style={s.emptyContainer}>
            <Text style={s.emptyText}>🎉 Repository has no changes. Clean status!</Text>
          </View>
        ) : (
          <View>
            {stagedFiles.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Staged Changes ({stagedFiles.length})</Text>
                  <TouchableOpacity onPress={() => handleStageAll(false)}>
                    <Text style={s.sectionLink}>Unstage All</Text>
                  </TouchableOpacity>
                </View>
                {stagedFiles.map((file) => (
                  <View key={file.path} style={s.fileRow}>
                    <TouchableOpacity style={s.fileCheckbox} onPress={() => handleStageFile(file.path, true)}>
                      <Text style={s.checkedBox}>[x]</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ flex: 1, paddingVertical: 10 }} onPress={() => viewDiff(file.path, true)}>
                      <Text style={s.filePathText} numberOfLines={1}>{file.path}</Text>
                      <Text style={[s.fileStatusText, { color: getStatusColor(file.status) }]}>
                        {file.status}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.diffBadge} onPress={() => viewDiff(file.path, true)}>
                      <Text style={s.diffBadgeText}>Diff</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {unstagedFiles.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Unstaged Changes ({unstagedFiles.length})</Text>
                  <TouchableOpacity onPress={() => handleStageAll(true)}>
                    <Text style={s.sectionLink}>Stage All</Text>
                  </TouchableOpacity>
                </View>
                {unstagedFiles.map((file) => (
                  <View key={file.path} style={s.fileRow}>
                    <TouchableOpacity style={s.fileCheckbox} onPress={() => handleStageFile(file.path, false)}>
                      <Text style={s.uncheckedBox}>[  ]</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ flex: 1, paddingVertical: 10 }} onPress={() => viewDiff(file.path, false)}>
                      <Text style={s.filePathText} numberOfLines={1}>{file.path}</Text>
                      <Text style={[s.fileStatusText, { color: getStatusColor(file.status) }]}>
                        {file.status}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.diffBadge} onPress={() => viewDiff(file.path, false)}>
                      <Text style={s.diffBadgeText}>Diff</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {stagedFiles.length > 0 && (
        <View style={s.commitBox}>
          <TextInput
            style={s.commitInput}
            placeholder="Commit message..."
            placeholderTextColor="#6B7280"
            value={commitMessage}
            onChangeText={setCommitMessage}
            multiline
          />
          <TouchableOpacity style={s.commitButton} onPress={handleCommit}>
            <Text style={s.commitButtonText}>Commit Staged Changes ({stagedFiles.length})</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={diffVisible} animationType="slide" transparent={false} onRequestClose={() => setDiffVisible(false)}>
        <SafeAreaView style={s.diffContainer}>
          <View style={s.diffHeader}>
            <TouchableOpacity style={s.backButton} onPress={() => setDiffVisible(false)}>
              <Text style={s.backButtonText}>Close</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={s.diffHeaderTitle} numberOfLines={1}>{diffFile}</Text>
              <Text style={s.diffHeaderSubtitle}>
                {diffIsStaged ? 'Staged Changes' : 'Unstaged Changes'}
              </Text>
            </View>
            <TouchableOpacity
              style={s.stageToggleBtn}
              onPress={async () => {
                const newStaged = !diffIsStaged;
                try {
                  await stageFiles(serverIp, token, workspace.id, [diffFile], newStaged);
                  const data = await fetchDiff(serverIp, token, workspace.id, diffFile, newStaged);
                  setDiffContent(data.diff);
                  setDiffIsStaged(newStaged);
                  await loadStatus();
                } catch (err: any) {
                  Alert.alert('Error', err.message);
                }
              }}
            >
              <Text style={s.stageToggleBtnText}>
                {diffIsStaged ? 'Unstage' : 'Stage'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.diffScroll} horizontal>
            <ScrollView style={s.diffScroll}>
              <View style={s.diffCodeWrapper}>
                {renderDiffLines(diffContent)}
              </View>
            </ScrollView>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={consoleVisible} animationType="fade" transparent onRequestClose={() => setConsoleVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Git Console</Text>
              <TouchableOpacity onPress={() => setConsoleVisible(false)}>
                <Text style={s.modalCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={s.consoleBody}>
              <Text style={s.consoleText}>{consoleOutput}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={branchVisible} animationType="fade" transparent onRequestClose={() => setBranchVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Branches</Text>
              <TouchableOpacity onPress={() => setBranchVisible(false)}>
                <Text style={s.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <TextInput
                style={[s.input, { flex: 1, marginRight: 8, marginBottom: 0 }]}
                placeholder="New branch name"
                placeholderTextColor="#6B7280"
                value={newBranchName}
                onChangeText={setNewBranchName}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={[s.commitButton, { paddingHorizontal: 16, paddingVertical: 10 }]} onPress={handleCreateBranch}>
                <Text style={s.commitButtonText}>Create</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {branches.length === 0 ? (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 20 }}>No branches found.</Text>
              ) : (
                branches.map((b) => {
                  const isCurrent = b.name === currentBranch;
                  return (
                    <View
                      key={b.name}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 12,
                        paddingHorizontal: 8,
                        borderBottomWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: isCurrent ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textPrimary, fontWeight: isCurrent ? 'bold' : '400', fontSize: 14 }}>
                          {b.name}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                          {b.commit?.substring(0, 7)} {b.label || ''}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {!isCurrent && (
                          <>
                            <TouchableOpacity
                              style={[s.pushActionButton, { backgroundColor: colors.accent }]}
                              onPress={() => handleCheckoutBranch(b.name)}
                            >
                              <Text style={s.pushActionButtonText}>Checkout</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[s.pushActionButton, { backgroundColor: colors.danger }]}
                              onPress={() => handleDeleteBranch(b.name)}
                            >
                              <Text style={s.pushActionButtonText}>Del</Text>
                            </TouchableOpacity>
                          </>
                        )}
                        {isCurrent && (
                          <View style={{ backgroundColor: colors.success, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
                            <Text style={{ color: '#0F172A', fontWeight: 'bold', fontSize: 11 }}>current</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={logVisible} animationType="fade" transparent onRequestClose={() => setLogVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Recent Commits</Text>
              <TouchableOpacity onPress={() => setLogVisible(false)}>
                <Text style={s.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 500 }}>
              {logEntries.length === 0 ? (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 20 }}>No commits found.</Text>
              ) : (
                logEntries.map((c, idx) => (
                  <View
                    key={c.hash + idx}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 4,
                      borderBottomWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: colors.warning, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 11 }}>
                        {c.hash.substring(0, 8)}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                        {c.date ? new Date(c.date).toLocaleDateString() : ''}
                      </Text>
                    </View>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '500' }} numberOfLines={2}>
                      {c.message}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                      {c.author_name}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={stashVisible} animationType="fade" transparent onRequestClose={() => setStashVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Stashes</Text>
              <TouchableOpacity onPress={() => setStashVisible(false)}>
                <Text style={s.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <TextInput
                style={[s.input, { flex: 1, marginRight: 8, marginBottom: 0 }]}
                placeholder="Stash message (optional)"
                placeholderTextColor="#6B7280"
                value={stashMessage}
                onChangeText={setStashMessage}
                autoCapitalize="none"
              />
              <TouchableOpacity style={[s.commitButton, { paddingHorizontal: 16, paddingVertical: 10 }]} onPress={handleSaveStash}>
                <Text style={s.commitButtonText}>Save</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <TouchableOpacity
                style={[s.pushActionButton, { backgroundColor: colors.accent, flex: 1 }]}
                onPress={handlePopStash}
              >
                <Text style={s.pushActionButtonText}>Pop Latest</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.pushActionButton, { backgroundColor: colors.danger, flex: 1 }]}
                onPress={handleDropStash}
              >
                <Text style={s.pushActionButtonText}>Drop Latest</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {stashEntries.length === 0 ? (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 20 }}>No stashes saved.</Text>
              ) : (
                stashEntries.map((st, idx) => (
                  <View
                    key={st.hash || idx}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 4,
                      borderBottomWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '500' }} numberOfLines={2}>
                      {st.message || 'WIP'}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                      {st.hash?.substring(0, 8)} {st.date ? new Date(st.date).toLocaleDateString() : ''}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={s.globalLoader}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
