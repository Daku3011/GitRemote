import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS } from '../utils/theme';
import { Header } from '../components/Header';

interface GithubTreeScreenProps {
  githubSelectedRepo: any;
  githubPathStack: string[];
  githubContents: any[];
  onDirectoryPress: (dirName: string) => Promise<void>;
  onDirectoryBack: () => Promise<void>;
  onOpenRepoScreen: () => void;
  onOpenFile: (file: any) => Promise<any>;
}

export const GithubTreeScreen: React.FC<GithubTreeScreenProps> = ({
  githubSelectedRepo,
  githubPathStack,
  githubContents,
  onDirectoryPress,
  onDirectoryBack,
  onOpenRepoScreen,
  onOpenFile,
}) => {
  if (!githubSelectedRepo) return null;

  const currentPathStr = githubPathStack.length > 0 ? `/${githubPathStack.join('/')}` : '/';

  const handleBackPress = () => {
    if (githubPathStack.length > 0) {
      onDirectoryBack();
    } else {
      onOpenRepoScreen();
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title={githubSelectedRepo.name}
        subtitle={`${currentPathStr} (${githubSelectedRepo.default_branch})`}
        onBack={handleBackPress}
        backText={githubPathStack.length > 0 ? 'Back' : 'Repos'}
      />

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
                  onDirectoryPress(item.name);
                } else {
                  onOpenFile(item);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.fileCol}>
                <Text style={styles.fileLabel}>
                  {item.type === 'dir' ? '📁' : '📄'}
                </Text>
                <Text style={styles.filePathText}>{item.name}</Text>
              </View>
              {item.type === 'file' && (
                <View style={styles.openBadge}>
                  <Text style={styles.openBadgeText}>View</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContainer: {
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
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
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
  },
  filePathText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
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
});
export default GithubTreeScreen;
