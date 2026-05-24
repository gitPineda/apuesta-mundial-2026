import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface StatusChipProps {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}

export function StatusChip({ label, tone = 'neutral' }: StatusChipProps) {
  return (
    <View style={[styles.chip, styles[tone]]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  neutral: {
    backgroundColor: colors.surfaceMuted,
  },
  success: {
    backgroundColor: '#DCFCE7',
  },
  warning: {
    backgroundColor: '#FEF3C7',
  },
  danger: {
    backgroundColor: '#FEE2E2',
  },
  text: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
});
