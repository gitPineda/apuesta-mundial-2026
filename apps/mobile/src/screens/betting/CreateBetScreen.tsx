import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { AppPopup } from '../../components/AppPopup';
import { InfoCard } from '../../components/InfoCard';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { api } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Bet, BetQuote } from '../../types/api';
import { AppScreenProps } from '../../navigation/types';
import { onlyDigits } from '../../utils/inputMasks';

export function CreateBetScreen({ navigation, route }: AppScreenProps<'CreateBet'>) {
  const { oddsId, selectionLabel } = route.params;
  const [stake, setStake] = useState('5');
  const [quote, setQuote] = useState<BetQuote | null>(null);
  const [popup, setPopup] = useState<{ title: string; message: string } | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [creating, setCreating] = useState(false);

  const numericStake = Number(stake);

  async function requestQuote() {
    setPopup(null);
    setLoadingQuote(true);
    try {
      const nextQuote = await api.post<BetQuote>('/bets/quote', {
        stake: numericStake,
        selections: [{ oddsId }],
      });
      setQuote(nextQuote);
    } catch (err) {
      setPopup({
        title: 'No se pudo calcular',
        message: err instanceof Error ? err.message : 'No se pudo calcular la apuesta.',
      });
    } finally {
      setLoadingQuote(false);
    }
  }

  async function createBet() {
    setPopup(null);
    setCreating(true);
    try {
      const bet = await api.post<Bet>('/bets', {
        stake: numericStake,
        selections: [{ oddsId }],
        idempotencyKey: `mobile-${oddsId}-${Date.now()}`,
      });
      navigation.replace('Payment', { betId: bet.id, amount: Number(bet.total_stake) });
    } catch (err) {
      setPopup({
        title: 'No se pudo confirmar',
        message: err instanceof Error ? err.message : 'No se pudo crear la apuesta.',
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Crear apuesta</Text>
        <Text style={styles.subtitle}>{selectionLabel}</Text>
      </View>

      <TextField
        label="Monto a apostar"
        value={stake}
        onChangeText={(value) => setStake(onlyDigits(value, 6))}
        keyboardType="number-pad"
      />

      <Button title="Calcular ganancia" onPress={requestQuote} loading={loadingQuote} disabled={!numericStake || numericStake <= 0} />

      {quote ? (
        <InfoCard>
          <Text style={styles.cardTitle}>Resumen</Text>
          <View style={styles.row}><Text style={styles.label}>Multiplicador</Text><Text style={styles.value}>{quote.multiplier.toFixed(2)}x</Text></View>
          <View style={styles.row}><Text style={styles.label}>Pago bruto</Text><Text style={styles.value}>${quote.grossPayout.toFixed(2)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Comision app</Text><Text style={styles.value}>${quote.platformFeeAmount.toFixed(2)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Comision operativa</Text><Text style={styles.value}>${quote.operatorFeeAmount.toFixed(2)}</Text></View>
          <View style={styles.row}><Text style={styles.total}>Pago neto</Text><Text style={styles.total}>${quote.netPayout.toFixed(2)}</Text></View>
          <Button title="Confirmar apuesta" onPress={createBet} loading={creating} />
        </InfoCard>
      ) : null}
      <LoadingOverlay
        visible={loadingQuote || creating}
        message={creating ? 'Confirmando apuesta...' : 'Calculando posible ganancia...'}
      />
      <AppPopup
        visible={Boolean(popup)}
        title={popup?.title ?? ''}
        message={popup?.message ?? ''}
        onAccept={() => setPopup(null)}
      />
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
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
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
  total: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '900',
  },
});
