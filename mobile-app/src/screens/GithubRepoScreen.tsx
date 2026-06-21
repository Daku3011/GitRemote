import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { COLORS } from '../utils/theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

interface GithubRepoScreenProps {
  githubRepos: any[];
  onDisconnect: () => void;
  onRefresh: () => Promise<any>;
  onOpenRepo: (repo: any) => void;
}

export const GithubRepoScreen: React.FC<GithubRepoScreenProps> = ({
  githubRepos,
  onDisconnect,
  onRefresh,
  onOpenRepo,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRepos = githubRepos.filter((repo) =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Header
        title="☁️ GitHub Repos"
        subtitle="Direct Cloud Mode"
        rightElement={
          <Button
            title="Exit"
            onPress={onDisconnect}
            variant="danger"
            size="small"
          />
        }
      />

      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Filter repositories..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        {filteredRepos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {githubRepos.length === 0
                ? 'No repositories found on this GitHub account.'
                : 'No repositories match your search.'}
            </Text>
            {githubRepos.length === 0 ? (
              <Button
                title="Reload"
                onPress={onRefresh}
                variant="outline"
                style={styles.scanBtn}
              />
            ) : null}
          </View>
        ) : (
          filteredRepos.map((repo) => (
            <TouchableOpacity
              key={repo.id}
              style={styles.repoItem}
              onPress={() => onOpenRepo(repo)}
              activeOpacity={0.75}
            >
              <View style={styles.repoRow}>
                <View style={styles.textCol}>
                  <Text style={styles.repoName}>{repo.name}</Text>
                  <Text style={styles.repoOwner} numberOfLines={1}>
                    {repo.owner.login}
                  </Text>
                </View>
                <View style={styles.badgeContainer}>
                  <Text style={styles.branchText}>🌲 {repo.default_branch}</Text>
                  <View style={styles.privacyBadge}>
                    <Text style={styles.privacyText}>
                      {repo.private ? 'Private' : 'Public'}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          title="Refresh List"
          onPress={onRefresh}
          variant="secondary"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  scanBtn: {
    borderColor: COLORS.border,
  },
  repoItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  repoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textCol: {
    flex: 1,
    marginRight: 10,
  },
  repoName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  repoOwner: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  badgeContainer: {
    alignItems: 'flex-end',
  },
  branchText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  privacyBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  privacyText: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  bottomBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1.5,
    borderColor: COLORS.border,
    padding: 16,
  },
});
export default GithubRepoScreen;
