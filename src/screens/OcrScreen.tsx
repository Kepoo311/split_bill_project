import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseReceiptText, detectReceiptExtras } from '../utils/ocrParser';
import { processReceiptOCR } from '../utils/ocrProcessor';
import type { TextRecognitionResult } from '@react-native-ml-kit/text-recognition';
import { BillItem, RootStackParamList } from '../types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { useBillStore } from '../store/billStore';
import { useCyberAlert } from '../hooks/useCyberAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'Ocr'>;

export const OcrScreen: React.FC<Props> = ({ navigation, route }) => {
  const { imageUri } = route.params;
  const [loading, setLoading] = useState<boolean>(true);
  const [items, setItems] = useState<BillItem[]>([]);
  const [ocrRawText, setOcrRawText] = useState<string>('');
  const [itemsModified, setItemsModified] = useState<boolean>(false);
  const [detectedTax, setDetectedTax] = useState<string>('');
  const [detectedTaxMode, setDetectedTaxMode] = useState<'nominal' | 'percent'>('nominal');
  const [detectedService, setDetectedService] = useState<string>('');
  const [detectedDiscount, setDetectedDiscount] = useState<string>('');
  const { saveLearningData, loadLearningData } = useBillStore();
  const { showCyberAlert, cyberAlertModal } = useCyberAlert();

  useEffect(() => {
    runOcr();
  }, [imageUri]);

  const runOcr = async () => {
    setLoading(true);
    try {
      let recognizedText = '';
      let recognitionError: string | null = null;
      let ocrResult: TextRecognitionResult | null = null;

      // Coba native ML Kit dengan semua rotasi untuk menangani posisi bill tidak pas
      try {
        const MlkitTextRecognition = require('@react-native-ml-kit/text-recognition').default;
        if (MlkitTextRecognition && MlkitTextRecognition.recognize) {
          // Coba deteksi langsung
          const result = await MlkitTextRecognition.recognize(imageUri);
          recognizedText = result.text || '';
          ocrResult = result;
          
          // Jika hasil kosong atau terlalu pendek, mungkin orientasi salah
          // User bisa rotate manual atau retake foto
          if (!recognizedText || recognizedText.length < 20) {
            showCyberAlert(
              'Deteksi Lemah',
              'Teks tidak terdeteksi dengan jelas. Pastikan foto struk:\n• Tidak blur/buram\n• Pencahayaan cukup\n• Posisi lurus/tidak miring\n\nAnda bisa tambah item secara manual dengan tombol + Item.',
            );
          }
        }
      } catch (error) {
        recognitionError = error instanceof Error ? error.message : String(error);
      }

      if (!recognizedText) {
        if (recognitionError) {
          showCyberAlert(
            'OCR tidak tersedia',
            `ML Kit tidak berhasil dijalankan. Pastikan aplikasi memakai development build yang menyertakan modul native.\n\nDetail: ${recognitionError}`,
          );
        }
        recognizedText = '';
      }

      const orderedRows = ocrResult?.blocks?.length
        ? processReceiptOCR(ocrResult)
        : [];
      const receiptText = orderedRows.length > 0
        ? orderedRows.join('\n')
        : recognizedText;
      setOcrRawText(receiptText);
      const pastLearnings = await loadLearningData();

      const parsed = parseReceiptText(receiptText, pastLearnings);
      const parsedSubtotal = parsed.reduce((sum, item) => sum + item.harga, 0);
      const extras = detectReceiptExtras(receiptText, parsedSubtotal);
      if (extras.taxMode === 'nominal' && extras.taxNominal > 0) {
        setDetectedTax(`${extras.taxNominal}`);
        setDetectedTaxMode('nominal');
      } else if (extras.taxMode === 'percent' && extras.taxPercent > 0) {
        setDetectedTax(`${extras.taxPercent}`);
        setDetectedTaxMode('percent');
      }
      if (extras.serviceCharge > 0) {
        setDetectedService(`${extras.serviceCharge}`);
      }
      if (extras.discount > 0) {
        setDetectedDiscount(`${extras.discount}`);
      }
      
      // Jika parsing kosong, buat 1 item default agar user bisa langsung isi
      if (parsed.length === 0) {
        setItems([
          {
            id: `${Date.now()}`,
            nama_item: 'Menu 1',
            harga: 10000,
            assignedTo: [],
          },
        ]);
      } else {
        setItems(parsed);
      }
    } catch (e: any) {
      showCyberAlert('Info', 'Silakan masukkan item menu secara manual.');
      setItems([
        {
          id: `${Date.now()}`,
          nama_item: 'Menu 1',
          harga: 10000,
          assignedTo: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = (id: string, field: 'nama_item' | 'harga', value: string) => {
    setItemsModified(true);
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === 'harga') {
          const num = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
          return { ...item, harga: num };
        }
        return { ...item, nama_item: value };
      })
    );
  };

  const handleDeleteItem = (id: string) => {
    setItemsModified(true);
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleAddItem = () => {
    setItemsModified(true);
    const newItem: BillItem = {
      id: `${Date.now()}`,
      nama_item: 'Menu Baru',
      harga: 10000,
      assignedTo: [],
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleProceed = async () => {
    if (items.length === 0) {
      showCyberAlert('Perhatian', 'Harap isi minimal 1 item belanja.');
      return;
    }

    // Jika user melakukan modifikasi/koreksi pada hasil OCR, simpan sebagai data pembelajaran
    if (itemsModified && ocrRawText) {
      await saveLearningData(ocrRawText, items);
    }

    navigation.navigate('Split', {
      items,
          initialTax: detectedTax ? parseFloat(detectedTax) : 0,
          initialTaxType: detectedTaxMode,
          initialService: detectedService ? parseFloat(detectedService) : 0,
          initialDiscount: detectedDiscount ? parseFloat(detectedDiscount) : 0,
        });
  };

  const handleShowRawText = () => {
    showCyberAlert('Teks OCR Mentah', ocrRawText || 'Tidak ada teks OCR', [
      {
        text: 'Salin',
        onPress: async () => {
          await Clipboard.setStringAsync(ocrRawText || '');
          showCyberAlert('Tersalin', 'Teks OCR berhasil disalin ke clipboard.');
        },
      },
      { text: 'Tutup', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Foto Ulang</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Daftar Menu</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity onPress={handleShowRawText} style={[styles.addButton, { backgroundColor: '#8E8E93' }]}>
            <Text style={styles.addButtonText}>Teks</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAddItem} style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Item</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.previewContainer}>
        <Image source={{ uri: imageUri }} style={styles.imageThumbnail} />
        <View style={styles.previewTextWrapper}>
          <Text style={styles.statusLabel}>
            {`${items.length} item siap dibagikan`}
          </Text>
          <Text style={styles.hintLabel}>Koreksi atau tambah menu secara langsung</Text>
        </View>
      </View>

      {(detectedTax || detectedService || detectedDiscount) && (
        <View style={styles.detectedExtrasCard}>
          <Text style={styles.detectedExtrasTitle}>✨ Terdeteksi Otomatis:</Text>
          <View style={styles.detectedBadgeRow}>
            {detectedTax ? (
              <View style={styles.detectedBadge}>
                <Text style={styles.detectedBadgeText}>
                  Pajak: {detectedTaxMode === 'nominal' ? `Rp ${parseInt(detectedTax, 10).toLocaleString('id-ID')}` : `${detectedTax}%`}
                </Text>
              </View>
            ) : null}
            {detectedService && (
              <View style={styles.detectedBadge}>
                <Text style={styles.detectedBadgeText}>Service: Rp {detectedService}</Text>
              </View>
            )}
            {detectedDiscount && (
              <View style={styles.detectedBadge}>
                <Text style={styles.detectedBadgeText}>Diskon: Rp {detectedDiscount}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Memproses OCR Offline...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.itemRow}>
              <TextInput
                style={styles.nameInput}
                value={item.nama_item}
                onChangeText={(val) => handleUpdateItem(item.id, 'nama_item', val)}
                placeholder="Nama Menu"
              />
              <View style={styles.priceContainer}>
                <Text style={styles.currencyPrefix}>Rp</Text>
                <TextInput
                  style={styles.priceInput}
                  value={item.harga > 0 ? item.harga.toString() : ''}
                  onChangeText={(val) => handleUpdateItem(item.id, 'harga', val)}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteItem(item.id)}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, (loading || items.length === 0) && styles.disabledButton]}
          onPress={handleProceed}
          disabled={loading || items.length === 0}
        >
          <Text style={styles.confirmButtonText}>Lanjut ke Bagi Tagihan →</Text>
        </TouchableOpacity>
      </View>
      {cyberAlertModal}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070A10' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0E1422',
  },
  backButton: { padding: 4 },
  backButtonText: { color: '#00F0FF', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  screenTitle: { fontSize: 16, fontWeight: '800', color: '#F9FAFB', letterSpacing: 1 },
  addButton: { 
    paddingVertical: 4, 
    paddingHorizontal: 8, 
    backgroundColor: 'rgba(0, 240, 255, 0.15)', 
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  addButtonText: { color: '#00F0FF', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0E1422',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  imageThumbnail: { 
    width: 50, 
    height: 65, 
    borderRadius: 8, 
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewTextWrapper: { marginLeft: 12, flex: 1 },
  statusLabel: { fontSize: 13, fontWeight: '700', color: '#F9FAFB', letterSpacing: 0.5 },
  hintLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  loadingWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#070A10' },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 13, letterSpacing: 0.5 },
  listContainer: { padding: 16, paddingBottom: 30 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1422',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  nameInput: { 
    flex: 1, 
    fontSize: 14, 
    color: '#F9FAFB', 
    padding: 4,
    fontWeight: '500',
  },
  priceContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  currencyPrefix: { fontSize: 13, color: '#6B7280', marginRight: 2, fontWeight: '600' },
  priceInput: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00F0FF',
    minWidth: 70,
    textAlign: 'right',
    padding: 4,
  },
  deleteButton: { 
    marginLeft: 12, 
    padding: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
  },
  deleteButtonText: { color: '#EF4444', fontSize: 15, fontWeight: '800' },
  footer: { 
    padding: 16, 
    backgroundColor: '#0E1422', 
    borderTopWidth: 1, 
    borderTopColor: '#1E293B',
  },
  confirmButton: { 
    backgroundColor: '#00F0FF', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  disabledButton: { backgroundColor: '#1E3A47', shadowOpacity: 0 },
  confirmButtonText: { 
    color: '#0A0A0F', 
    fontSize: 15, 
    fontWeight: '800',
    letterSpacing: 1,
  },
  detectedExtrasCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  detectedExtrasTitle: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  detectedBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detectedBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detectedBadgeText: {
    color: '#F0F9FF',
    fontSize: 11,
    fontWeight: '700',
  },
});
