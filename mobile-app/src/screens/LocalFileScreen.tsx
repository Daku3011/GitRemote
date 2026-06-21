import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { COLORS, FONTS } from '../utils/theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';

interface LocalFileScreenProps {
  selectedWorkspace: any;
  localSelectedFile: any;
  localFileContent: string;
  setLocalFileContent: (val: string) => void;
  localCommitMessage: string;
  setLocalCommitMessage: (val: string) => void;
  localIsEditing: boolean;
  setLocalIsEditing: (val: boolean) => void;
  onBack: () => void;
  onCommit: (message: string) => Promise<boolean>;
}

export const LocalFileScreen: React.FC<LocalFileScreenProps> = ({
  selectedWorkspace,
  localSelectedFile,
  localFileContent,
  setLocalFileContent,
  localCommitMessage,
  setLocalCommitMessage,
  localIsEditing,
  setLocalIsEditing,
  onBack,
  onCommit,
}) => {
  if (!selectedWorkspace || !localSelectedFile) return null;

  const handleCommitSubmit = async () => {
    if (localCommitMessage.trim()) {
      await onCommit(localCommitMessage);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title={localSelectedFile.name}
        subtitle={`Size: ${(localSelectedFile.size / 1024).toFixed(2)} KB (local)`}
        onBack={onBack}
        rightElement={
          <Button
            title={localIsEditing ? 'Cancel' : 'Edit'}
            onPress={() => setLocalIsEditing(!localIsEditing)}
            variant={localIsEditing ? 'danger' : 'secondary'}
            size="small"
          />
        }
      />

      {localIsEditing ? (
        <View style={styles.editorContainer}>
          <TextInput
            style={styles.codeEditor}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            value={localFileContent}
            onChangeText={setLocalFileContent}
          />
          <View style={styles.commitBox}>
            <TextInput
              style={styles.commitInput}
              placeholder="Commit message (e.g. fix: solve layout bug)"
              placeholderTextColor="#6B7280"
              value={localCommitMessage}
              onChangeText={setLocalCommitMessage}
              multiline
            />
            <Button
              title="Save & Commit to PC"
              onPress={handleCommitSubmit}
            />
          </View>
        </View>
      ) : (
        <ScrollView style={styles.diffScroll}>
          <ScrollView style={styles.diffScroll} horizontal={true}>
            <View style={styles.diffCodeWrapper}>
              {localFileContent.split('\n').map((line, idx) => (
                <View key={idx} style={styles.diffLineContainer}>
                  <Text style={styles.lineNumber}>{idx + 1}</Text>
                  <Text style={styles.diffTextNormal}>{line}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  editorContainer: {
    flex: 1,
  },
  codeEditor: {
    flex: 1,
    backgroundColor: '#05070F',
    color: COLORS.success,
    fontFamily: FONTS.mono,
    fontSize: 13,
    padding: 16,
    textAlignVertical: 'top',
  },
  diffScroll: {
    flex: 1,
  },
  diffCodeWrapper: {
    paddingVertical: 12,
  },
  diffLineContainer: {
    flexDirection: 'row',
    paddingRight: 24,
    paddingVertical: 2,
    alignItems: 'center',
  },
  lineNumber: {
    width: 40,
    textAlign: 'right',
    fontSize: 10,
    color: '#4B5563',
    fontFamily: FONTS.mono,
    marginRight: 12,
    userSelect: 'none',
  },
  diffTextNormal: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: FONTS.mono,
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
});
export default LocalFileScreen;
