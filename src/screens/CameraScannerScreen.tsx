import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useCyberAlert } from '../hooks/useCyberAlert';
import { colors } from '../theme';
import { AppText } from '../components/AppText';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'CameraScanner'>;

export const CameraScannerScreen: React.FC<Props> = ({ navigation }) => {
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { showCyberAlert, cyberAlertModal } = useCyberAlert();

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00F0FF" />
        <AppText style={styles.loadingText}>Memuat kamera...</AppText>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <AppText style={styles.permissionTitle}>Akses Kamera Diperlukan</AppText>
          <AppText style={styles.permissionText}>
            Untuk scan struk, aplikasi memerlukan izin akses kamera.
          </AppText>
          <TouchableOpacity style={styles.grantButton} onPress={requestPermission}>
            <AppText style={styles.grantButtonText}>Berikan Izin</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <AppText style={styles.cancelButtonText}>Batal</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
      });

      if (photo?.uri) {
        navigation.replace('Ocr', { imageUri: photo.uri });
      } else {
        showCyberAlert('Gagal Mengambil Foto', 'Kamera tidak menghasilkan file foto. Coba lagi.');
      }
    } catch (error) {
      console.error('Capture error:', error);
      showCyberAlert('Gagal Mengambil Foto', 'Terjadi kesalahan saat mengambil foto. Coba lagi.');
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
        {/* Top HUD Header */}
        <View style={styles.topHUD}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <AppText style={styles.closeButtonText}>Tutup</AppText>
          </TouchableOpacity>
          <View style={styles.statusBadge}>
            <AppText style={styles.statusBadgeText}>Mode Scan</AppText>
          </View>
          <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
            <Ionicons name="camera-reverse-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Futuristic Scan Frame Guide */}
        <View style={styles.scanFrameContainer}>
          <View style={styles.scanFrame}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />

            {/* Center guide text */}
            <View style={styles.centerGuide}>
              <AppText style={styles.guideText}>Posisikan Struk</AppText>
              <AppText style={styles.guideSubtext}>di dalam bingkai</AppText>
            </View>
          </View>

          {/* Scan line animation placeholder */}
          <View style={styles.scanLineContainer}>
            <View style={styles.scanLine} />
          </View>
        </View>

        {/* Bottom Control Panel */}
        <View style={styles.bottomPanel}>
          <View style={styles.instructionBox}>
            <AppText style={styles.instructionText}>
              Pastikan pencahayaan cukup dan struk dalam fokus
            </AppText>
          </View>

          <TouchableOpacity
            style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
            onPress={handleCapture}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator size="large" color="#0A0A0F" />
            ) : (
              <View style={styles.captureButtonInner}>
                <AppText style={styles.captureButtonText}>SCAN</AppText>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </CameraView>
      {cyberAlertModal}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { color: colors.textDim, fontSize: 14, marginTop: 12 },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    maxWidth: 340,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 13,
    color: colors.textFaint,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  grantButton: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  grantButtonText: { color: colors.ink, fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
  cancelButton: { paddingVertical: 10 },
  cancelButtonText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  topHUD: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'rgba(11, 17, 32, 0.72)',
  },
  closeButton: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closeButtonText: { color: colors.danger, fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  statusBadge: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(212, 160, 23, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeText: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  flipButton: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(212, 160, 23, 0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButtonText: { fontSize: 20 },
  scanFrameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  scanFrame: {
    width: '100%',
    aspectRatio: 0.7,
    maxHeight: 500,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.accent,
    borderWidth: 3,
  },
  cornerTopLeft: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
  cornerTopRight: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
  cornerBottomLeft: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  cornerBottomRight: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
  centerGuide: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  guideText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  guideSubtext: {
    color: colors.textDim,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  scanLineContainer: {
    position: 'absolute',
    width: '100%',
    height: 2,
    top: '50%',
    opacity: 0.7,
  },
  scanLine: {
    width: '100%',
    height: 2,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  bottomPanel: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(11, 17, 32, 0.72)',
    alignItems: 'center',
  },
  instructionBox: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  instructionText: {
    color: colors.textFaint,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.accentBorder,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  captureButtonDisabled: {
    backgroundColor: colors.line,
    borderColor: colors.border,
    shadowOpacity: 0,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(11, 17, 32, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
