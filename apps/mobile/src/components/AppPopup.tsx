import { Modal, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { Button } from './Button';

interface AppPopupProps {
  visible: boolean;
  title: string;
  message: string;
  buttonTitle?: string;
  onAccept: () => void;
}

export function AppPopup({
  visible,
  title,
  message,
  buttonTitle = 'Aceptar',
  onAccept,
}: AppPopupProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onAccept}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Button title={buttonTitle} onPress={onAccept} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '900',
  },
  message: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
});
