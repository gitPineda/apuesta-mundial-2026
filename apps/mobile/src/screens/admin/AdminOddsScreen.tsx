import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppPopup } from '../../components/AppPopup';
import { Button } from '../../components/Button';
import { AdminMatchPicker } from '../../components/AdminMatchPicker';
import { InfoCard } from '../../components/InfoCard';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { api } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Market } from '../../types/api';
import { Match } from '../../types/api';
import { onlyDecimal } from '../../utils/inputMasks';

export function AdminOddsScreen() {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedOdd, setSelectedOdd] = useState<{ id: string; label: string } | null>(null);
  const [decimalOdds, setDecimalOdds] = useState('');
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{ title: string; message: string } | null>(null);

  async function loadMarkets(matchId = selectedMatch?.id) {
    if (!matchId) return;
    setLoading(true);
    try {
      setMarkets(await api.get<Market[]>(`/admin/matches/${matchId}/markets`));
    } catch (err) {
      setPopup({
        title: 'No se pudo cargar',
        message: err instanceof Error ? err.message : 'No se pudieron cargar cuotas.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function saveOdd() {
    if (!selectedOdd) return;
    const parsedOdds = Number(decimalOdds.replace(',', '.'));
    if (!Number.isFinite(parsedOdds) || parsedOdds < 1) {
      setPopup({ title: 'Multiplicador invalido', message: 'El multiplicador debe ser mayor o igual a 1.00.' });
      return;
    }

    setLoading(true);
    try {
      await api.post(`/admin/odds/${selectedOdd.id}`, {
        decimalOdds: parsedOdds,
        status: 'active',
      });
      setPopup({ title: 'Cuota actualizada', message: 'El multiplicador fue guardado.' });
      await loadMarkets();
    } catch (err) {
      setPopup({
        title: 'No se pudo guardar',
        message: err instanceof Error ? err.message : 'No se pudo actualizar la cuota.',
      });
    } finally {
      setLoading(false);
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
      {selectedOdd ? (
        <InfoCard>
          <Text style={styles.cardTitle}>{selectedOdd.label}</Text>
          <TextField label="Nuevo multiplicador" value={decimalOdds} onChangeText={(value) => setDecimalOdds(onlyDecimal(value, 3, 2))} keyboardType="decimal-pad" />
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
      <LoadingOverlay visible={loading} message="Procesando cuotas..." />
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
  header: { gap: spacing.sm },
  title: { ...typography.title, color: colors.text },
  subtitle: { color: colors.textMuted },
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
