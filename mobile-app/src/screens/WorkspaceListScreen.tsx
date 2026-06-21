import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS } from '../utils/theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';

interface WorkspaceListScreenProps {
  serverIp: string;
  workspaces: any[];
  onDisconnect: () => void;
  onRefresh: () => Promise<any>;
  onOpenWorkspace: (ws: any) => void;
}

export const WorkspaceListScreen: React.FC<WorkspaceListScreenProps> = ({
  serverIp,
  workspaces,
  onDisconnect,
  onRefresh,
  onOpenWorkspace,
}) => {
  return (
    <View style={styles.container}>
      <Header
        title="📁 Local Projects"
        subtitle={`Connected: ${serverIp}`}
        rightElement={
          <Button
            title="Exit"
            onPress={onDisconnect}
            variant="danger"
            size="small"
          />
        }
      />

      <ScrollView contentContainerStyle={styles.listContainer}>
        {workspaces.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No Git projects found in your configured scanning directory.
            </Text>
            <Button
              title="Re-Scan Agent"
              onPress={onRefresh}
              variant="outline"
              style={styles.scanBtn}
            />
          </View>
        ) : (
          workspaces.map((ws) => (
            <TouchableOpacity
              key={ws.id}
              style={styles.workspaceItem}
              onPress={() => onOpenWorkspace(ws)}
              activeOpacity={0.75}
            >
              <View style={styles.workspaceRow}>
                <View style={styles.textCol}>
                  <Text style={styles.workspaceName}>{ws.name}</Text>
                  <Text style={styles.workspacePath} numberOfLines={1}>
                    {ws.path}
                  </Text>
                </View>
                <View style={styles.badgeContainer}>
                  <Text style={styles.branchText}>🌲 {ws.currentBranch}</Text>
                  {ws.changesCount > 0 ? (
                    <View style={styles.dangerBadge}>
                      <Text style={styles.dangerBadgeText}>
                        {ws.changesCount} change{ws.changesCount > 1 ? 's' : ''}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.successBadge}>
                      <Text style={styles.successBadgeText}>clean</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          title="Scan Workspaces"
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
    lineHeight: 22,
  },
  scanBtn: {
    borderColor: COLORS.border,
  },
  workspaceItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  workspaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textCol: {
    flex: 1,
    marginRight: 10,
  },
  workspaceName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  workspacePath: {
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
  dangerBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  dangerBadgeText: {
    color: COLORS.danger,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  successBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  successBadgeText: {
    color: COLORS.success,
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
export default WorkspaceListScreen;
