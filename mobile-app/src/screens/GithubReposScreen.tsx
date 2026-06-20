import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { s } from '../styles';

interface GithubRepo {
  id: number;
  name: string;
  owner: { login: string };
  default_branch: string;
  private: boolean;
}

interface GithubReposScreenProps {
  githubToken: string;
  onSelectRepo: (repo: GithubRepo) => void;
  onDisconnect: () => void;
}

export default function GithubReposScreen({
  githubToken,
  onSelectRepo,
  onDisconnect,
}: GithubReposScreenProps) {
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return repos;
    const q = search.toLowerCase();
    return repos.filter(r => r.name.toLowerCase().includes(q) || r.owner.login.toLowerCase().includes(q));
  }, [repos, search]);

  const fetchGithubRepos = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
        headers: {
          'Authorization': `token ${githubToken}`,
          'User-Agent': 'GitMobileToPC',
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message || `HTTP ${res.status}`);
      }
      const data: GithubRepo[] = await res.json();
      setRepos(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch repositories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGithubRepos();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>☁️ GitHub Repositories</Text>
          <Text style={s.headerSubtitle}>Direct GitHub Cloud Mode</Text>
        </View>
        <TouchableOpacity style={s.outlineButtonDanger} onPress={onDisconnect}>
          <Text style={s.buttonTextDanger}>Exit</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={s.searchBar}
        placeholder="Search repos..."
        placeholderTextColor="#6B7280"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {loading ? (
        <View style={s.emptyContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.listContainer}>
          {filtered.length === 0 ? (
            <View style={s.emptyContainer}>
              <Text style={s.emptyText}>
                {search ? 'No repos match your search.' : 'No repositories found or token lacks scopes.'}
              </Text>
              {!search && (
                <TouchableOpacity style={s.outlineButton} onPress={fetchGithubRepos}>
                  <Text style={s.buttonText}>Reload</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filtered.map((repo) => (
              <TouchableOpacity key={repo.id} style={s.workspaceItem} onPress={() => onSelectRepo(repo)}>
                <View style={s.workspaceRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.workspaceName}>{repo.name}</Text>
                    <Text style={s.workspacePath} numberOfLines={1}>{repo.owner.login}</Text>
                  </View>
                  <View style={s.badgeContainer}>
                    <Text style={s.branchText}>🌲 {repo.default_branch}</Text>
                    <View style={s.successBadge}>
                      <Text style={s.successBadgeText}>{repo.private ? 'Private' : 'Public'}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      <View style={s.bottomBar}>
        <TouchableOpacity style={s.fullWidthButton} onPress={fetchGithubRepos}>
          <Text style={s.buttonText}>Refresh List</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
