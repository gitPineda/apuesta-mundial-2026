import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { InfoCard } from '../../components/InfoCard';
import { Screen } from '../../components/Screen';
import { StatusChip } from '../../components/StatusChip';
import { AppStackParamList } from '../../navigation/types';
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
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
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
        {bets.map((bet) => {
          const selection = bet.selections?.[0];
          const canContinuePayment = bet.status === 'pending_payment' && bet.payment_status === 'created';
          return (
            <InfoCard key={bet.id}>
              <StatusChip label={statusLabel(bet.status)} tone={bet.status === 'active' ? 'success' : 'neutral'} />
              <Text style={styles.betId}>#{bet.id.slice(0, 8)}</Text>
              {selection ? (
                <View style={styles.selectionBox}>
                  <Text style={styles.matchTitle}>{selection.homeTeamName} vs {selection.awayTeamName}</Text>
                  <Text style={styles.selectionLine}>
                    {marketLabel(selection.marketType)}: {selection.selectionLabel}
                  </Text>
                  <Text style={styles.selectionMeta}>
                    {selection.kickoffLocalDate ?? ''} {selection.kickoffLocalTime ?? ''}
                  </Text>
                </View>
              ) : null}
              <View style={styles.row}><Text style={styles.label}>Apostado</Text><Text style={styles.value}>${Number(bet.total_stake).toFixed(2)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Pago neto si gana</Text><Text style={styles.value}>${Number(bet.net_payout).toFixed(2)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Pago</Text><Text style={styles.value}>{paymentLabel(bet.payment_status)}</Text></View>
              {canContinuePayment ? (
                <Button
                  title="Completar transferencia"
                  onPress={() => navigation.navigate('Payment', { betId: bet.id, amount: Number(bet.total_stake) })}
                />
              ) : null}
            </InfoCard>
          );
        })}
      </View>
    </Screen>
  );
}

function marketLabel(type: string) {
  if (type === 'match_winner') return 'Resultado simple';
  if (type === 'exact_score') return 'Resultado por marcador';
  return type;
}

function paymentLabel(status: string) {
  const map: Record<string, string> = {
    created: 'Pendiente de transferencia',
    pending: 'Transferencia en revision',
    confirmed: 'Confirmado',
    rejected: 'Rechazado',
    failed: 'Fallido',
    refunded: 'Reembolsado',
  };
  return map[status] ?? status;
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
  selectionBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    gap: spacing.xs,
  },
  matchTitle: {
    color: colors.text,
    fontWeight: '900',
  },
  selectionLine: {
    color: colors.text,
    fontWeight: '700',
  },
  selectionMeta: {
    color: colors.textMuted,
  },
  error: {
    color: colors.danger,
  },
  empty: {
    color: colors.textMuted,
  },
});
