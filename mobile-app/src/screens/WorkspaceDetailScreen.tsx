import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { COLORS, FONTS } from '../utils/theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';

interface WorkspaceDetailScreenProps {
  selectedWorkspace: any;
  workspaceStatus: any;
  commitMessage: string;
  setCommitMessage: (msg: string) => void;
  onBack: () => void;
  onRefresh: () => Promise<any>;
  onPush: () => Promise<void>;
  onPull: () => Promise<void>;
  onToggleStageFile: (filePath: string, currentStaged: boolean) => Promise<void>;
  onToggleAllFiles: (stageAll: boolean) => Promise<void>;
  onViewDiff: (filePath: string, staged: boolean) => Promise<void>;
  onCommit: (message: string) => Promise<boolean>;

  // Local File System Traversal Props
  localPathStack: string[];
  localContents: any[];
  onLoadLocalContents: () => Promise<any>;
  onLocalDirPress: (dirName: string) => Promise<void>;
  onLocalDirBack: () => Promise<void>;
  onOpenLocalFile: (file: any) => Promise<any>;

  // Local Git History Props
  localCommits: any[];
  onLoadLocalCommits: () => Promise<any>;
}

const getBranchColor = (columnIndex: number) => {
  const colors = [
    '#3B82F6', // Blue (main)
    '#F97316', // Orange (branch 1)
    '#10B981', // Green (branch 2)
    '#8B5CF6', // Purple (branch 3)
    '#EC4899', // Pink (branch 4)
    '#F59E0B', // Yellow (branch 5)
  ];
  return colors[Math.floor(columnIndex / 2) % colors.length];
};

const renderRefsBadges = (refsStr: string) => {
  if (!refsStr) return null;
  const cleanRefs = refsStr.replace(/[()]/g, '').trim();
  if (!cleanRefs) return null;
  
  const refsArray = cleanRefs.split(', ');
  return (
    <View style={styles.refsBadgeContainer}>
      {refsArray.map((ref, idx) => {
        let isLocal = ref.includes('HEAD ->') || (!ref.includes('/') && !ref.includes('tag:'));
        let isRemote = ref.includes('origin/');
        let isTag = ref.includes('tag:');
        
        let badgeColor = COLORS.textMuted;
        let badgeBg = COLORS.surfaceDark;
        let label = ref;

        if (ref.includes('HEAD ->')) {
          label = ref.replace('HEAD -> ', '');
          badgeColor = '#3B82F6'; // Blue
          badgeBg = 'rgba(59, 130, 246, 0.15)';
        } else if (isRemote) {
          badgeColor = '#F97316'; // Orange
          badgeBg = 'rgba(249, 115, 22, 0.15)';
        } else if (isLocal) {
          badgeColor = '#3B82F6'; // Blue
          badgeBg = 'rgba(59, 130, 246, 0.15)';
        } else if (isTag) {
          label = ref.replace('tag: ', '🏷️ ');
          badgeColor = '#10B981'; // Green
          badgeBg = 'rgba(16, 185, 129, 0.15)';
        }

        return (
          <View key={idx} style={[styles.refBadge, { backgroundColor: badgeBg, borderColor: badgeColor }]}>
            <Text style={[styles.refBadgeText, { color: badgeColor }]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

export const WorkspaceDetailScreen: React.FC<WorkspaceDetailScreenProps> = ({
  selectedWorkspace,
  workspaceStatus,
  commitMessage,
  setCommitMessage,
  onBack,
  onRefresh,
  onPush,
  onPull,
  onToggleStageFile,
  onToggleAllFiles,
  onViewDiff,
  onCommit,
  localPathStack,
  localContents,
  onLoadLocalContents,
  onLocalDirPress,
  onLocalDirBack,
  onOpenLocalFile,
  localCommits,
  onLoadLocalCommits,
}) => {
  const [activeTab, setActiveTab] = useState<'changes' | 'files' | 'history'>('changes');

  useEffect(() => {
    if (activeTab === 'files') {
      onLoadLocalContents();
    } else if (activeTab === 'history') {
      onLoadLocalCommits();
    }
  }, [activeTab]);

  if (!selectedWorkspace || !workspaceStatus) return null;

  const stagedFiles = workspaceStatus.files.filter((f: any) => f.staged);
  const unstagedFiles = workspaceStatus.files.filter((f: any) => !f.staged);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added':
      case 'untracked':
        return COLORS.success;
      case 'deleted':
        return COLORS.danger;
      default:
        return COLORS.warning;
    }
  };

  const handleCommitSubmit = async () => {
    if (commitMessage.trim()) {
      await onCommit(commitMessage);
    }
  };

  const handleRefreshClick = () => {
    if (activeTab === 'files') {
      onLoadLocalContents();
    } else if (activeTab === 'history') {
      onLoadLocalCommits();
    } else {
      onRefresh();
    }
  };

  const currentPathStr = localPathStack.length > 0 ? `/${localPathStack.join('/')}` : '/';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title={selectedWorkspace.name}
        subtitle={
          activeTab === 'files'
            ? `${currentPathStr} (local)`
            : activeTab === 'history'
            ? 'Commit History Logs'
            : `🌲 ${workspaceStatus.branch}`
        }
        onBack={onBack}
        backText="Projects"
        rightElement={
          <View style={styles.headerRightActions}>
            <TouchableOpacity style={styles.refreshBtn} onPress={handleRefreshClick}>
              <Text style={styles.refreshIcon}>🔄</Text>
            </TouchableOpacity>
            
            <Button
              title="Pull"
              onPress={onPull}
              variant="outline"
              size="small"
              style={styles.pullBtn}
            />

            <Button
              title={`Push (${workspaceStatus.ahead})`}
              onPress={onPush}
              variant="secondary"
              size="small"
              disabled={workspaceStatus.ahead === 0}
              style={workspaceStatus.ahead === 0 ? styles.disabledBtn : undefined}
            />
          </View>
        }
      />

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'changes' ? styles.tabActive : null]}
          onPress={() => setActiveTab('changes')}
        >
          <Text style={[styles.tabText, activeTab === 'changes' ? styles.tabTextActive : null]}>
            Changes ({workspaceStatus.files.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'files' ? styles.tabActive : null]}
          onPress={() => setActiveTab('files')}
        >
          <Text style={[styles.tabText, activeTab === 'files' ? styles.tabTextActive : null]}>
            Files
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' ? styles.tabActive : null]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' ? styles.tabTextActive : null]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody}>
        {activeTab === 'changes' ? (
          workspaceStatus.files.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                🎉 Repository has no changes. Clean status!
              </Text>
            </View>
          ) : (
            <View>
              {stagedFiles.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Staged Changes ({stagedFiles.length})</Text>
                    <TouchableOpacity onPress={() => onToggleAllFiles(false)}>
                      <Text style={styles.sectionLink}>Unstage All</Text>
                    </TouchableOpacity>
                  </View>
                  {stagedFiles.map((file: any) => (
                    <View key={file.path} style={styles.fileRow}>
                      <TouchableOpacity
                        style={styles.checkboxContainer}
                        onPress={() => onToggleStageFile(file.path, true)}
                      >
                        <Text style={styles.checkedBox}>[x]</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.fileLabelBtn}
                        onPress={() => onViewDiff(file.path, true)}
                      >
                        <Text style={styles.filePathText} numberOfLines={1}>{file.path}</Text>
                        <Text style={[styles.fileStatusText, { color: getStatusColor(file.status) }]}>
                          {file.status}
                        </Text>
                      </TouchableOpacity>

                      <Button
                        title="Diff"
                        onPress={() => onViewDiff(file.path, true)}
                        variant="outline"
                        size="small"
                        style={styles.diffBtn}
                      />
                    </View>
                  ))}
                </View>
              )}

              {unstagedFiles.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Unstaged Changes ({unstagedFiles.length})</Text>
                    <TouchableOpacity onPress={() => onToggleAllFiles(true)}>
                      <Text style={styles.sectionLink}>Stage All</Text>
                    </TouchableOpacity>
                  </View>
                  {unstagedFiles.map((file: any) => (
                    <View key={file.path} style={styles.fileRow}>
                      <TouchableOpacity
                        style={styles.checkboxContainer}
                        onPress={() => onToggleStageFile(file.path, false)}
                      >
                        <Text style={styles.uncheckedBox}>[  ]</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.fileLabelBtn}
                        onPress={() => onViewDiff(file.path, false)}
                      >
                        <Text style={styles.filePathText} numberOfLines={1}>{file.path}</Text>
                        <Text style={[styles.fileStatusText, { color: getStatusColor(file.status) }]}>
                          {file.status}
                        </Text>
                      </TouchableOpacity>

                      <Button
                        title="Diff"
                        onPress={() => onViewDiff(file.path, false)}
                        variant="outline"
                        size="small"
                        style={styles.diffBtn}
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          )
        ) : activeTab === 'files' ? (
          <View>
            {localPathStack.length > 0 && (
              <TouchableOpacity
                style={styles.fileRow}
                onPress={onLocalDirBack}
                activeOpacity={0.7}
              >
                <View style={styles.fileCol}>
                  <Text style={styles.fileLabel}>📁</Text>
                  <Text style={styles.filePathText}>..</Text>
                </View>
              </TouchableOpacity>
            )}
            
            {localContents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Empty repository folder.</Text>
              </View>
            ) : (
              localContents.map((item) => (
                <TouchableOpacity
                  key={item.path}
                  style={styles.fileRow}
                  onPress={() => {
                    if (item.type === 'dir') {
                      onLocalDirPress(item.name);
                    } else {
                      onOpenLocalFile(item);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.fileCol}>
                    <Text style={styles.fileLabel}>{item.type === 'dir' ? '📁' : '📄'}</Text>
                    <Text style={styles.filePathText} numberOfLines={1}>{item.name}</Text>
                  </View>
                  {item.type === 'file' && (
                    <View style={styles.openBadge}>
                      <Text style={styles.openBadgeText}>View</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          /* History Commit Graph Timeline Tab */
          <View style={styles.historyContainer}>
            {localCommits.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No commits found in git log history.</Text>
              </View>
            ) : (
              localCommits.map((item, idx) => (
                <View
                  key={item.type === 'commit' ? item.hash : `graph-${idx}-${item.graph}`}
                  style={[styles.commitRow, item.type === 'graph' ? styles.graphTransitionRow : null]}
                >
                  {/* Graph visualization column */}
                  <View style={styles.graphColumn}>
                    {item.graph.split('').map((char: string, charIdx: number) => {
                      const branchColor = getBranchColor(charIdx);
                      
                      if (char === ' ') {
                        return <View key={charIdx} style={styles.graphSlot} />;
                      }
                      
                      if (char === '|') {
                        return (
                          <View key={charIdx} style={styles.graphSlot}>
                            <View style={[styles.graphLineVertical, { backgroundColor: branchColor }]} />
                          </View>
                        );
                      }
                      
                      if (char === '*') {
                        return (
                          <View key={charIdx} style={styles.graphSlot}>
                            <View style={[styles.graphLineVertical, { backgroundColor: branchColor }]} />
                            <View style={[styles.graphNode, { backgroundColor: branchColor }]} />
                          </View>
                        );
                      }
                      
                      if (char === '/' || char === '\\') {
                        return (
                          <View key={charIdx} style={styles.graphSlot}>
                            <Text style={[styles.graphChar, { color: branchColor }]}>{char}</Text>
                          </View>
                        );
                      }
                      
                      if (char === '_') {
                        return (
                          <View key={charIdx} style={styles.graphSlot}>
                            <View style={[styles.graphLineHorizontal, { backgroundColor: branchColor }]} />
                          </View>
                        );
                      }
                      
                      return (
                        <View key={charIdx} style={styles.graphSlot}>
                          <Text style={[styles.graphChar, { color: branchColor }]}>{char}</Text>
                        </View>
                      );
                    })}
                  </View>
                  
                  {/* Right side details card */}
                  {item.type === 'commit' ? (
                    <View style={styles.commitContentCard}>
                      <Text style={styles.commitMessageText}>{item.subject}</Text>
                      
                      {item.refs ? renderRefsBadges(item.refs) : null}

                      <View style={styles.commitMetadataRow}>
                        <Text style={styles.commitAuthorText} numberOfLines={1}>
                          👤 {item.author}
                        </Text>
                        <Text style={styles.commitDateText}>
                          🕒 {item.date}
                        </Text>
                      </View>
                      <Text style={styles.commitHashText}>
                        SHA: {item.shortHash}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.graphSpacer} />
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {activeTab === 'changes' && stagedFiles.length > 0 && (
        <View style={styles.commitBox}>
          <TextInput
            style={styles.commitInput}
            placeholder="Commit message..."
            placeholderTextColor="#6B7280"
            value={commitMessage}
            onChangeText={setCommitMessage}
            multiline
            numberOfLines={2}
          />
          <Button
            title={`Commit Staged Changes (${stagedFiles.length})`}
            onPress={handleCommitSubmit}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshBtn: {
    padding: 8,
    marginRight: 10,
  },
  refreshIcon: {
    fontSize: 18,
  },
  pullBtn: {
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceDark,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: COLORS.surface,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: COLORS.secondary,
  },
  scrollBody: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1.5,
    borderColor: COLORS.border,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionLink: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  checkboxContainer: {
    marginRight: 12,
    paddingVertical: 12,
  },
  checkedBox: {
    color: COLORS.success,
    fontSize: 16,
    fontWeight: '800',
  },
  uncheckedBox: {
    color: '#4B5563',
    fontSize: 16,
  },
  fileLabelBtn: {
    flex: 1,
    paddingVertical: 10,
  },
  filePathText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  fileStatusText: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  diffBtn: {
    borderColor: COLORS.border,
    paddingHorizontal: 10,
  },
  fileCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  fileLabel: {
    fontSize: 16,
    marginRight: 12,
    paddingVertical: 12,
  },
  openBadge: {
    backgroundColor: COLORS.surfaceDark,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  openBadgeText: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  commitBox: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1.5,
    borderColor: COLORS.border,
    padding: 16,
  },
  commitInput: {
    backgroundColor: COLORS.surfaceDark,
    borderRadius: 10,
    color: COLORS.text,
    padding: 12,
    fontSize: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  // COMMIT HISTORY STYLES
  historyContainer: {
    paddingLeft: 4,
  },
  commitRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'stretch',
  },
  graphTransitionRow: {
    marginBottom: 0,
  },
  graphColumn: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginRight: 8,
  },
  graphSlot: {
    width: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  graphLineVertical: {
    width: 2.5,
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 1,
  },
  graphLineHorizontal: {
    height: 2.5,
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
  },
  graphNode: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: COLORS.background,
    zIndex: 2,
  },
  graphChar: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 16,
    fontWeight: 'bold',
    zIndex: 1,
  },
  commitContentCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 14,
  },
  graphSpacer: {
    flex: 1,
    height: 24,
  },
  commitMessageText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  refsBadgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  refBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  refBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  commitMetadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  commitAuthorText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  commitDateText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  commitHashText: {
    color: COLORS.secondary,
    fontFamily: FONTS.mono,
    fontSize: 10.5,
    marginTop: 8,
  },
});
export default WorkspaceDetailScreen;
