import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseReceiptText, detectReceiptExtras } from '../utils/ocrParser';
import { processReceiptOCR } from '../utils/ocrProcessor';
import { buildLearningIndex, applyLearning } from '../utils/ocrLearning';
import { generateId } from '../utils/ids';
import { Image } from 'expo-image';
import type { TextRecognitionResult } from '@react-native-ml-kit/text-recognition';
import { BillItem, RootStackParamList } from '../types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import * as MlKitModule from '@react-native-ml-kit/text-recognition';
import { useBillStore } from '../store/billStore';
import { useCyberAlert } from '../hooks/useCyberAlert';
import { TopBar } from '../components/TopBar';
import { colors } from '../theme';
import { formatNumber } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'Ocr'>;

interface OcrItemRowProps {
  item: BillItem;
  onUpdate: (id: string, field: 'nama_item' | 'harga', value: string) => void;
  onDelete: (id: string) => void;
}

function OcrItemRow({ item, onUpdate, onDelete }: OcrItemRowProps) {
  return (
    <View style={styles.itemRow}>
      <TextInput
        style={styles.nameInput}
        value={item.nama_item}
        onChangeText={(val) => onUpdate(item.id, 'nama_item', val)}
        placeholder="Nama Menu"
        placeholderTextColor={colors.textDim}
      />
      <View style={styles.priceContainer}>
        <Text style={styles.currencyPrefix}>Rp</Text>
        <TextInput
          style={styles.priceInput}
          value={item.harga > 0 ? item.harga.toString() : ''}
          onChangeText={(val) => onUpdate(item.id, 'harga', val)}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.textDim}
        />
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete(item.id)}
        accessibilityLabel={`Hapus item ${item.nama_item}`}
        hitSlop={6}
      >
        <Text style={styles.deleteButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

// Row memoized: mengedit satu item tidak me-render ulang seluruh daftar.
const OcrItemRowMemo = React.memo(OcrItemRow);

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
  const [learnNote, setLearnNote] = useState('');
  const saveLearningData = useBillStore((s) => s.saveLearningData);
  const loadLearningData = useBillStore((s) => s.loadLearningData);
  const { showCyberAlert, cyberAlertModal } = useCyberAlert();

  // Dideklarasikan sebelum effect yang memanggilnya (hoisting eksplisit via
  // useCallback); identitas hanya berubah saat foto berganti.
  const runOcr = useCallback(async () => {
    setLoading(true);
    setLearnNote('');
    try {
      let recognizedText = '';
      let recognitionError: string | null = null;
      let ocrResult: TextRecognitionResult | null = null;

      // Coba native ML Kit; bila modul native tak tersedia (mis. Expo Go),
      // binding-nya undefined dan dilewati tanpa crash.
      try {
        const MlkitTextRecognition = MlKitModule.default;
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

      const parsed = parseReceiptText(receiptText);
      const learningIndex = buildLearningIndex(pastLearnings);
      const outcome = applyLearning(parsed, receiptText, learningIndex);
      if (outcome.cacheHit) {
        setLearnNote('Struk yang sama — memakai koreksi tersimpanmu');
      } else if (outcome.fixes > 0) {
        setLearnNote(`${outcome.fixes} perbaikan otomatis dari koreksi sebelumnya`);
      }
      const finalItems = outcome.items;
      const parsedSubtotal = finalItems.reduce((sum, item) => sum + item.harga, 0);
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
      if (finalItems.length === 0) {
        setItems([
          {
            id: generateId(),
            nama_item: 'Menu 1',
            harga: 10000,
            assignedTo: [],
          },
        ]);
      } else {
        setItems(finalItems);
      }
    } catch {
      showCyberAlert('Info', 'Silakan masukkan item menu secara manual.');
      setItems([
        {
          id: generateId(),
          nama_item: 'Menu 1',
          harga: 10000,
          assignedTo: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [imageUri, loadLearningData, showCyberAlert]);

  useEffect(() => {
    let active = true;
    // setState pertama dijalankan sebagai microtask, bukan sinkron di body
    // effect, agar tidak memicu render berantai (react-hooks/set-state-in-effect).
    Promise.resolve().then(() => {
      if (active) runOcr();
    });
    return () => {
      active = false;
    };
  }, [runOcr]);

  const handleUpdateItem = useCallback(
    (id: string, field: 'nama_item' | 'harga', value: string) => {
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
    },
    []
  );

  const handleDeleteItem = useCallback((id: string) => {
    setItemsModified(true);
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const handleAddItem = () => {
    setItemsModified(true);
    const newItem: BillItem = {
      id: generateId(),
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
      try {
        await saveLearningData(ocrRawText, items);
      } catch (e) {
        console.warn('Gagal menyimpan learning data, lanjut navigasi:', e);
      }
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
      <TopBar
        title="Daftar Menu"
        onBack={() => navigation.goBack()}
        backLabel="← Foto Ulang"
        right={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              onPress={handleShowRawText}
              style={[styles.addButton, { backgroundColor: 'rgba(148, 163, 184, 0.2)' }]}
            >
              <Text style={styles.addButtonText}>Teks</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAddItem} style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Item</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.previewContainer}>
        <Image
          source={{ uri: imageUri }}
          style={styles.imageThumbnail}
          contentFit="cover"
          transition={200}
          placeholder={colors.surface}
        />
        <View style={styles.previewTextWrapper}>
          <Text style={styles.statusLabel}>
            {`${items.length} item siap dibagikan`}
          </Text>
          <Text style={styles.hintLabel}>Koreksi atau tambah menu secara langsung</Text>
        </View>
      </View>

      {learnNote ? (
        <View style={styles.learnNoteCard}>
          <Text style={styles.learnNoteText}>✨ {learnNote}</Text>
        </View>
      ) : null}

      {(detectedTax || detectedService || detectedDiscount) && (
        <View style={styles.detectedExtrasCard}>
          <Text style={styles.detectedExtrasTitle}>✨ Terdeteksi Otomatis:</Text>
          <View style={styles.detectedBadgeRow}>
            {detectedTax ? (
              <View style={styles.detectedBadge}>
                <Text style={styles.detectedBadgeText}>
                  Pajak: {detectedTaxMode === 'nominal' ? `Rp ${formatNumber(parseInt(detectedTax, 10))}` : `${detectedTax}%`}
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
            <OcrItemRowMemo
              item={item}
              onUpdate={handleUpdateItem}
              onDelete={handleDeleteItem}
            />
          )}
        />
      )}

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.confirmButton,
            (loading || items.length === 0) && styles.disabledButton,
            pressed && !(loading || items.length === 0) && styles.buttonPressed,
          ]}
          onPress={handleProceed}
          disabled={loading || items.length === 0}
          accessibilityRole="button"
        >
          <Text style={styles.confirmButtonText}>Lanjut ke Bagi Tagihan →</Text>
        </Pressable>
      </View>
      {cyberAlertModal}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  addButton: { 
    paddingVertical: 4, 
    paddingHorizontal: 8, 
    backgroundColor: colors.accentSoft, 
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  addButtonText: { color: colors.accent, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  imageThumbnail: { 
    width: 50, 
    height: 65, 
    borderRadius: 8, 
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: colors.line,
  },
  previewTextWrapper: { marginLeft: 12, flex: 1 },
  statusLabel: { fontSize: 13, fontWeight: '700', color: colors.text, letterSpacing: 0.5 },
  hintLabel: { fontSize: 11, color: colors.textDim, marginTop: 2 },
  learnNoteCard: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: colors.successBorder,
  },
  learnNoteText: { color: colors.success, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  loadingWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  loadingText: { marginTop: 12, color: colors.textDim, fontSize: 13, letterSpacing: 0.5 },
  listContainer: { padding: 16, paddingBottom: 30 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nameInput: { 
    flex: 1, 
    fontSize: 14, 
    color: colors.text, 
    padding: 4,
    fontWeight: '500',
  },
  priceContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  currencyPrefix: { fontSize: 13, color: colors.textDim, marginRight: 2, fontWeight: '600' },
  priceInput: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
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
  deleteButtonText: { color: colors.danger, fontSize: 15, fontWeight: '800' },
  footer: { 
    padding: 16, 
    backgroundColor: colors.surface, 
    borderTopWidth: 1, 
    borderTopColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.accent,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  disabledButton: { backgroundColor: '#1E3A47', shadowOpacity: 0 },
  confirmButtonText: { 
    color: colors.ink, 
    fontSize: 15, 
    fontWeight: '800',
    letterSpacing: 1,
  },
  detectedExtrasCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detectedExtrasTitle: {
    color: colors.info,
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
    backgroundColor: colors.infoSoft,
    borderWidth: 1,
    borderColor: colors.info,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detectedBadgeText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
  },
});
