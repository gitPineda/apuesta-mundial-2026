import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { AdminMatchPicker } from '../../components/AdminMatchPicker';
import { InfoCard } from '../../components/InfoCard';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { api } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Market } from '../../types/api';
import { Match } from '../../types/api';

export function AdminOddsScreen() {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedOdd, setSelectedOdd] = useState<{ id: string; label: string } | null>(null);
  const [decimalOdds, setDecimalOdds] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadMarkets(matchId = selectedMatch?.id) {
    if (!matchId) return;
    setError('');
    setMessage('');
    setLoading(true);
    try {
      setMarkets(await api.get<Market[]>(`/admin/matches/${matchId}/markets`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar cuotas.');
    } finally {
      setLoading(false);
    }
  }

  async function saveOdd() {
    if (!selectedOdd) return;
    setError('');
    setMessage('');
    const parsedOdds = Number(decimalOdds.replace(',', '.'));
    if (!Number.isFinite(parsedOdds) || parsedOdds < 1) {
      setError('El multiplicador debe ser mayor o igual a 1.00.');
      return;
    }

    try {
      await api.post(`/admin/odds/${selectedOdd.id}`, {
        decimalOdds: parsedOdds,
        status: 'active',
      });
      setMessage('Cuota actualizada.');
      await loadMarkets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la cuota.');
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Cuotas</Text>
        <Text style={styles.subtitle}>Edita multiplicadores por partido y mercado.</Text>
      </View>
      <AdminMatchPicker
        selectedMatch={selectedMatch}
        onSelect={(match) => {
          setSelectedMatch(match);
          void loadMarkets(match.id);
        }}
      />
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {selectedOdd ? (
        <InfoCard>
          <Text style={styles.cardTitle}>{selectedOdd.label}</Text>
          <TextField label="Nuevo multiplicador" value={decimalOdds} onChangeText={setDecimalOdds} keyboardType="decimal-pad" />
          <Button title="Guardar multiplicador" onPress={saveOdd} disabled={!decimalOdds.trim()} />
        </InfoCard>
      ) : null}
      {markets.map((market) => (
        <InfoCard key={market.id}>
          <Text style={styles.cardTitle}>{market.name}</Text>
          {market.odds.map((odd) => (
            <Pressable
              key={odd.id}
              style={styles.oddRow}
              onPress={() => {
                setSelectedOdd({ id: odd.id, label: odd.selectionLabel });
                setDecimalOdds(String(Number(odd.decimalOdds)));
              }}
            >
              <Text style={styles.oddLabel}>{odd.selectionLabel}</Text>
              <Text style={styles.oddValue}>{Number(odd.decimalOdds).toFixed(2)}x</Text>
            </Pressable>
          ))}
        </InfoCard>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  title: { ...typography.title, color: colors.text },
  subtitle: { color: colors.textMuted },
  error: { color: colors.danger },
  success: { color: colors.success, fontWeight: '900' },
  cardTitle: { color: colors.text, fontWeight: '900', fontSize: 17 },
  oddRow: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  oddLabel: { color: colors.text, flex: 1, fontWeight: '700' },
  oddValue: { color: colors.primary, fontWeight: '900' },
});
