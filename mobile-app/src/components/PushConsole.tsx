import React from 'react';
import { StyleSheet, View, Text, Modal, ScrollView } from 'react-native';
import { COLORS, FONTS } from '../utils/theme';
import { Button } from './Button';

interface PushConsoleProps {
  visible: boolean;
  onClose: () => void;
  output: string;
}

export const PushConsole: React.FC<PushConsoleProps> = ({ visible, onClose, output }) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🖥️ Git Console Output</Text>
            <Button
              title="Close"
              onPress={onClose}
              variant="outline"
              size="small"
            />
          </View>
          <ScrollView style={styles.consoleBody}>
            <Text style={styles.consoleText}>
              {output || 'No output log returned from server.'}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderColor: COLORS.border,
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  consoleBody: {
    backgroundColor: COLORS.surfaceDark,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  consoleText: {
    color: COLORS.success,
    fontFamily: FONTS.mono,
    fontSize: 12,
    lineHeight: 18,
  },
});
export default PushConsole;
