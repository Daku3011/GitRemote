import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { decodeBase64, encodeBase64 } from '../utils/base64';
import { s } from '../styles';

interface GithubFileScreenProps {
  repo: any;
  file: any;
  githubToken: string;
  onBack: () => void;
}

export default function GithubFileScreen({
  repo,
  file,
  githubToken,
  onBack,
}: GithubFileScreenProps) {
  const [content, setContent] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [sha, setSha] = useState('');
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const res = await fetch(file.url, {
          headers: {
            Authorization: `token ${githubToken}`,
            'User-Agent': 'GitMobileToPC',
            Accept: 'application/vnd.github.v3+json',
          },
        });
        const data = await res.json();
        if (data.content) {
          const decoded = decodeBase64(data.content);
          setContent(decoded);
          setEditedContent(decoded);
        }
        if (data.sha) setSha(data.sha);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to fetch file content');
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [file.url, githubToken]);

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      Alert.alert('Error', 'Please enter a commit message');
      return;
    }
    setCommitting(true);
    try {
      const res = await fetch(file.url, {
        method: 'PUT',
        headers: {
          Authorization: `token ${githubToken}`,
          'User-Agent': 'GitMobileToPC',
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: commitMessage.trim(),
          content: encodeBase64(editedContent),
          sha,
          branch: repo.default_branch,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setContent(editedContent);
        setSha(data.content.sha);
        setIsEditing(false);
        setCommitMessage('');
        Alert.alert('Success', 'File committed successfully to ' + repo.default_branch);
      } else {
        Alert.alert('Commit Failed', data.message || 'Unknown error');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network error');
    } finally {
      setCommitting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0F19' }}>
        <ActivityIndicator color="#3B82F6" size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.header}>
        <TouchableOpacity style={s.backButton} onPress={onBack}>
          <Text style={s.backButtonText}>⬅ Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={s.headerTitle} numberOfLines={1}>{file.name}</Text>
          <Text style={s.headerSubtitle}>
            Size: {(file.size / 1024).toFixed(2)} KB
          </Text>
        </View>
        <TouchableOpacity
          style={s.pushActionButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Text style={s.pushActionButtonText}>
            {isEditing ? 'View Mode' : 'Edit Code'}
          </Text>
        </TouchableOpacity>
      </View>

      {isEditing ? (
        <View style={{ flex: 1 }}>
          <TextInput
            style={s.codeEditor}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            value={editedContent}
            onChangeText={setEditedContent}
          />
          <View style={s.commitBox}>
            <TextInput
              style={s.commitInput}
              placeholder="Commit message (e.g. fix: update layout)"
              placeholderTextColor="#6B7280"
              value={commitMessage}
              onChangeText={setCommitMessage}
              multiline
            />
            <TouchableOpacity
              style={[s.commitButton, committing && { opacity: 0.6 }]}
              onPress={handleCommit}
              disabled={committing}
            >
              {committing ? (
                <ActivityIndicator color="#0F172A" />
              ) : (
                <Text style={s.commitButtonText}>Commit directly to GitHub</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView style={s.diffScroll}>
          <View style={s.diffCodeWrapper}>
            {content.split('\n').map((line, idx) => (
              <View key={idx} style={s.diffLineContainer}>
                <Text style={s.lineNumber}>{idx + 1}</Text>
                <Text style={s.diffTextNormal}>{line}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
