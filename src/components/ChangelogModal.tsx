import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ChangelogEntry } from '../constants/changelog';

interface ChangelogModalProps {
  visible: boolean;
  entry: ChangelogEntry | null;
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({
  visible,
  entry,
  onClose,
}) => {
  if (!visible || !entry) return null;

  return (
    <Modal visible={true} animationType="slide" transparent={true}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Apa yang Baru?</Text>
          <Text style={styles.version}>v{entry.version} · {entry.date}</Text>
        </View>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {entry.items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Tutup</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  container: {
    margin: 20,
    marginTop: '30%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#070A10',
  },
  version: {
    fontSize: 13,
    color: '#6B7280',
  },
  list: { maxHeight: 300 },
  listContent: { gap: 10 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    fontSize: 15,
    color: '#2563EB',
    marginTop: 1,
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  closeBtn: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});