import React from 'react';
import { StyleSheet, View, Text, Modal, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { COLORS, FONTS } from '../utils/theme';
import { Button } from './Button';

interface DiffViewerProps {
  visible: boolean;
  onClose: () => void;
  file: string;
  diff: string;
  isStaged: boolean;
  onToggleStage: () => Promise<void>;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  visible,
  onClose,
  file,
  diff,
  isStaged,
  onToggleStage,
}) => {
  const renderDiffLines = (diffText: string) => {
    if (!diffText || diffText.trim() === '') {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.diffTextNormal}>No changes detected or binary file.</Text>
        </View>
      );
    }
    const lines = diffText.split('\n');
    return lines.map((line, idx) => {
      let lineStyle = styles.diffTextNormal;
      let bgStyle = {};
      
      if (line.startsWith('+') && !line.startsWith('+++')) {
        lineStyle = styles.diffTextAdd;
        bgStyle = { backgroundColor: 'rgba(16, 185, 129, 0.12)' };
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        lineStyle = styles.diffTextDelete;
        bgStyle = { backgroundColor: 'rgba(239, 68, 68, 0.12)' };
      } else if (line.startsWith('@@')) {
        lineStyle = styles.diffTextHeader;
        bgStyle = { backgroundColor: 'rgba(99, 102, 241, 0.18)' };
      } else if (line.startsWith('diff') || line.startsWith('index') || line.startsWith('---') || line.startsWith('+++')) {
        lineStyle = styles.diffTextMeta;
        bgStyle = { backgroundColor: COLORS.surfaceDark };
      }

      return (
        <View key={idx} style={[styles.diffLineContainer, bgStyle]}>
          <Text style={styles.lineNumber}>{idx + 1}</Text>
          <Text style={[styles.codeText, lineStyle]}>{line}</Text>
        </View>
      );
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>{file}</Text>
            <Text style={styles.headerSubtitle}>
              {isStaged ? 'Staged Changes' : 'Unstaged Changes'}
            </Text>
          </View>
          <Button
            title={isStaged ? 'Unstage' : 'Stage'}
            onPress={onToggleStage}
            variant={isStaged ? 'danger' : 'primary'}
            size="small"
          />
        </View>

        <ScrollView style={styles.diffScroll} horizontal={true}>
          <ScrollView style={styles.diffScroll}>
            <View style={styles.diffCodeWrapper}>
              {renderDiffLines(diff)}
            </View>
          </ScrollView>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  closeBtn: {
    paddingVertical: 8,
  },
  closeBtnText: {
    color: COLORS.secondary,
    fontWeight: '700',
    fontSize: 15,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 16,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
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
  codeText: {
    fontSize: 12,
    fontFamily: FONTS.mono,
  },
  diffTextNormal: {
    color: COLORS.textSecondary,
  },
  diffTextAdd: {
    color: COLORS.success,
  },
  diffTextDelete: {
    color: COLORS.danger,
  },
  diffTextHeader: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  diffTextMeta: {
    color: COLORS.textMuted,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
});
export default DiffViewer;
