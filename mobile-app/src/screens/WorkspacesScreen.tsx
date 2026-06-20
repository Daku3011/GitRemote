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
import { Workspace } from '../types';
import { fetchWorkspaces } from '../api';
import { s } from '../styles';

interface Props {
  serverIp: string;
  token: string;
  onSelect: (workspace: Workspace) => void;
  onDisconnect: () => void;
}

export default function WorkspacesScreen({ serverIp, token, onSelect, onDisconnect }: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return workspaces;
    const q = search.toLowerCase();
    return workspaces.filter(
      ws => ws.name.toLowerCase().includes(q) || ws.path.toLowerCase().includes(q)
    );
  }, [workspaces, search]);

  const loadWorkspaces = async () => {
    setLoading(true);
    try {
      const data = await fetchWorkspaces(serverIp, token);
      setWorkspaces(data);
    } catch (err: any) {
      Alert.alert('Fetch Failed', 'Failed to retrieve projects. Check connection to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>📁 Local Projects</Text>
          <Text style={s.headerSubtitle}>Connected: {serverIp}</Text>
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
      <ScrollView contentContainerStyle={s.listContainer}>
        {filtered.length === 0 ? (
          <View style={s.emptyContainer}>
            <Text style={s.emptyText}>
              {search ? 'No repos match your search.' : 'No Git projects found in your documents folder.'}
            </Text>
            {!search && (
              <TouchableOpacity style={s.outlineButton} onPress={loadWorkspaces}>
                <Text style={s.buttonText}>Re-Scan Agent</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map((ws) => (
            <TouchableOpacity key={ws.id} style={s.workspaceItem} onPress={() => onSelect(ws)}>
              <View style={s.workspaceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.workspaceName}>{ws.name}</Text>
                  <Text style={s.workspacePath} numberOfLines={1}>{ws.path}</Text>
                </View>
                <View style={s.badgeContainer}>
                  <Text style={s.branchText}>🌲 {ws.currentBranch}</Text>
                  {ws.changesCount > 0 ? (
                    <View style={s.dangerBadge}>
                      <Text style={s.dangerBadgeText}>{ws.changesCount} changes</Text>
                    </View>
                  ) : (
                    <View style={s.successBadge}>
                      <Text style={s.successBadgeText}>clean</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <View style={s.bottomBar}>
        <TouchableOpacity style={s.fullWidthButton} onPress={loadWorkspaces}>
          <Text style={s.buttonText}>Scan Workspaces</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={s.globalLoader}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      )}
    </View>
  );
}
