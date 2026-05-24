import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { InfoCard } from '../../components/InfoCard';
import { Screen } from '../../components/Screen';
import { StatusChip } from '../../components/StatusChip';
import { api } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Bet } from '../../types/api';

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending_payment: 'Pendiente de pago',
    payment_review: 'En revision',
    active: 'Activa',
    won: 'Ganada',
    lost: 'Perdida',
    void: 'Anulada',
    refunded: 'Reembolsada',
  };
  return map[status] ?? status;
}

export function HistoryScreen() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      api
        .get<Bet[]>('/bets')
        .then(setBets)
        .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el historial.'))
        .finally(() => setLoading(false));
    }, []),
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Historial</Text>
        <Text style={styles.subtitle}>Estados de apuestas y pagos.</Text>
      </View>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && bets.length === 0 ? <Text style={styles.empty}>Todavia no tienes apuestas.</Text> : null}

      <View style={styles.list}>
        {bets.map((bet) => (
          <InfoCard key={bet.id}>
            <StatusChip label={statusLabel(bet.status)} tone={bet.status === 'active' ? 'success' : 'neutral'} />
            <Text style={styles.betId}>#{bet.id.slice(0, 8)}</Text>
            <View style={styles.row}><Text style={styles.label}>Apostado</Text><Text style={styles.value}>${Number(bet.total_stake).toFixed(2)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Pago neto si gana</Text><Text style={styles.value}>${Number(bet.net_payout).toFixed(2)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Pago</Text><Text style={styles.value}>{bet.payment_status}</Text></View>
          </InfoCard>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    color: colors.textMuted,
  },
  list: {
    gap: spacing.md,
  },
  betId: {
    color: colors.text,
    fontWeight: '900',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  label: {
    color: colors.textMuted,
  },
  value: {
    color: colors.text,
    fontWeight: '800',
  },
  error: {
    color: colors.danger,
  },
  empty: {
    color: colors.textMuted,
  },
});
