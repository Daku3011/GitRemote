import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { s } from '../styles';

interface GithubTreeScreenProps {
  repo: any;
  githubToken: string;
  onOpenFile: (file: any) => void;
  onBack: () => void;
}

export default function GithubTreeScreen({
  repo,
  githubToken,
  onOpenFile,
  onBack,
}: GithubTreeScreenProps) {
  const [contents, setContents] = useState<any[]>([]);
  const [pathStack, setPathStack] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContents = async (stack: string[]) => {
    setLoading(true);
    try {
      const pathStr = stack.join('/');
      const url = pathStr
        ? `https://api.github.com/repos/${repo.owner.login}/${repo.name}/contents/${pathStr}`
        : `https://api.github.com/repos/${repo.owner.login}/${repo.name}/contents/`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitMobileToPC',
        },
      });
      if (!response.ok) throw new Error(`GitHub contents fetch failed: ${response.status}`);
      const data = await response.json();
      const sorted = Array.isArray(data)
        ? data.sort((a: any, b: any) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'dir' ? -1 : 1;
          })
        : [];
      setContents(sorted);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to read repository contents: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContents([]);
  }, []);

  const handleDirectoryPress = async (dirName: string) => {
    const newStack = [...pathStack, dirName];
    setPathStack(newStack);
    await fetchContents(newStack);
  };

  const handleDirectoryBack = async () => {
    if (pathStack.length > 0) {
      const newStack = [...pathStack];
      newStack.pop();
      setPathStack(newStack);
      await fetchContents(newStack);
    } else {
      onBack();
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0F19' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}>
        <TouchableOpacity style={s.backButton} onPress={handleDirectoryBack}>
          <Text style={s.backButtonText}>
            {pathStack.length > 0 ? '⬅ Back' : '⬅ Repos'}
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={s.headerTitle} numberOfLines={1}>{repo.name}</Text>
          <Text style={s.headerSubtitle}>
            /{pathStack.join('/')} ({repo.default_branch})
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.listContainer}>
        {contents.length === 0 ? (
          <View style={s.emptyContainer}>
            <Text style={s.emptyText}>Empty directory folder.</Text>
          </View>
        ) : (
          contents.map((item) => (
            <TouchableOpacity
              key={item.sha}
              style={s.fileRow}
              onPress={() => {
                if (item.type === 'dir') {
                  handleDirectoryPress(item.name);
                } else {
                  onOpenFile(item);
                }
              }}
            >
              <View style={{ flex: 1, paddingVertical: 14 }}>
                <Text style={s.filePathText}>
                  {item.type === 'dir' ? '📁 ' : '📄 '}
                  {item.name}
                </Text>
              </View>
              {item.type === 'file' && (
                <View style={s.diffBadge}>
                  <Text style={s.diffBadgeText}>Open</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}
