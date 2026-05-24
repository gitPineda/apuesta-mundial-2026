import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { AdminMatchPicker } from '../../components/AdminMatchPicker';
import { AppPopup } from '../../components/AppPopup';
import { InfoCard } from '../../components/InfoCard';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { api } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Match } from '../../types/api';

interface SettlementSummary {
  officialResult: {
    home_score: number;
    away_score: number;
    is_official: boolean;
    recorded_at: string;
  } | null;
  canSettle: boolean;
  alreadySettled: boolean;
  summary: {
    total: number;
    won: number;
    lost: number;
    open_to_settle: number;
    already_settled: number;
    total_stake: string;
    total_payout: string;
  };
  bets: Array<{
    bet_id: string;
    email: string;
    market_name: string;
    selection_key: string;
    status: string;
    net_payout: string;
  }>;
}

export function AdminResultsScreen() {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [homeScore, setHomeScore] = useState('0');
  const [awayScore, setAwayScore] = useState('0');
  const [settlement, setSettlement] = useState<SettlementSummary | null>(null);
  const [popup, setPopup] = useState<{ title: string; message: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('Procesando...');

  function onlyNonNegativeInteger(value: string) {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '0';
    return String(Number(digits));
  }

  async function saveResult() {
    setPopup(null);
    try {
      if (!selectedMatch) return;
      setProcessingMessage('Registrando resultado oficial...');
      setProcessing(true);
      await api.post(`/admin/matches/${selectedMatch.id}/result`, {
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
      });
      setHomeScore('0');
      setAwayScore('0');
      await loadSettlement();
      setPopup({ title: 'Resultado registrado', message: 'El marcador oficial fue guardado correctamente.' });
    } catch (err) {
      setPopup({
        title: 'No se pudo registrar',
        message: err instanceof Error ? err.message : 'No se pudo registrar resultado.',
      });
    } finally {
      setProcessing(false);
    }
  }

  async function settleMatch() {
    if (!selectedMatch) return;
    setPopup(null);
    if (!settlement?.officialResult) {
      setPopup({
        title: 'Resultado requerido',
        message: 'Primero registra el resultado oficial del partido para poder liquidar apuestas.',
      });
      return;
    }
    if (settlement.alreadySettled) {
      setPopup({
        title: 'Partido ya liquidado',
        message: 'Este juego ya fue liquidado. Puedes consultar el resumen de liquidacion.',
      });
      return;
    }
    try {
      setProcessingMessage('Liquidando apuestas del partido...');
      setProcessing(true);
      const result = await api.post<{ won: number; lost: number; alreadySettled?: boolean }>(`/admin/matches/${selectedMatch.id}/settle`);
      await loadSettlement();
      if (result.alreadySettled) {
        setPopup({
          title: 'Partido ya liquidado',
          message: 'Este juego ya fue liquidado anteriormente. Se muestra el resumen actualizado.',
        });
        return;
      }
      setPopup({
        title: 'Liquidacion completada',
        message: `${result.won} apuestas ganadas y ${result.lost} apuestas perdidas.`,
      });
    } catch (err) {
      setPopup({
        title: 'No se pudo liquidar',
        message: err instanceof Error ? err.message : 'No se pudo liquidar el partido.',
      });
    } finally {
      setProcessing(false);
    }
  }

  async function loadSettlement(matchId = selectedMatch?.id) {
    if (!matchId) return;
    try {
      setProcessingMessage('Cargando resumen de liquidacion...');
      setProcessing(true);
      setSettlement(await api.get<SettlementSummary>(`/admin/matches/${matchId}/settlement`));
    } catch (err) {
      setSettlement(null);
      setPopup({
        title: 'No se pudo cargar resumen',
        message: err instanceof Error ? err.message : 'No se pudo cargar el resumen.',
      });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Resultados</Text>
        <Text style={styles.subtitle}>Carga marcador oficial por partido.</Text>
      </View>
      <AdminMatchPicker
        selectedMatch={selectedMatch}
        onSelect={(match) => {
          setSelectedMatch(match);
          setSettlement(null);
          setPopup(null);
          void loadSettlement(match.id);
        }}
      />
      <InfoCard>
        {settlement?.officialResult ? (
          <Text style={styles.success}>
            Resultado oficial registrado: {settlement.officialResult.home_score} - {settlement.officialResult.away_score}
          </Text>
        ) : selectedMatch ? (
          <Text style={styles.warning}>Sin resultado oficial. No se pueden liquidar apuestas todavia.</Text>
        ) : null}
        <TextField
          label="Goles equipo local"
          value={homeScore}
          onChangeText={(value) => setHomeScore(onlyNonNegativeInteger(value))}
          keyboardType="number-pad"
        />
        <TextField
          label="Goles equipo visitante"
          value={awayScore}
          onChangeText={(value) => setAwayScore(onlyNonNegativeInteger(value))}
          keyboardType="number-pad"
        />
        <Button title="Registrar resultado" onPress={saveResult} disabled={!selectedMatch} />
        <Button
          title="Liquidar apuestas"
          variant="secondary"
          onPress={settleMatch}
          disabled={!selectedMatch || !settlement?.officialResult}
        />
        <Button title="Ver resumen" variant="secondary" onPress={() => void loadSettlement()} disabled={!selectedMatch} />
      </InfoCard>
      {settlement ? (
        <InfoCard>
          <Text style={styles.cardTitle}>Resumen de liquidacion</Text>
          <Text style={styles.line}>Total apuestas: {settlement.summary.total}</Text>
          <Text style={styles.line}>Ganadas: {settlement.summary.won}</Text>
          <Text style={styles.line}>Perdidas: {settlement.summary.lost}</Text>
          <Text style={styles.line}>Pendientes por liquidar: {settlement.summary.open_to_settle}</Text>
          {settlement.alreadySettled ? <Text style={styles.success}>Este partido ya fue liquidado.</Text> : null}
          <Text style={styles.line}>Total apostado: ${Number(settlement.summary.total_stake).toFixed(2)}</Text>
          <Text style={styles.line}>Total a pagar: ${Number(settlement.summary.total_payout).toFixed(2)}</Text>
          {settlement.bets.map((bet) => (
            <View key={bet.bet_id} style={styles.betRow}>
              <Text style={styles.betEmail}>{bet.email}</Text>
              <Text style={styles.line}>{bet.market_name} - {bet.selection_key}</Text>
              <Text style={bet.status === 'won' ? styles.success : styles.error}>
                {bet.status} - paga ${Number(bet.net_payout).toFixed(2)}
              </Text>
            </View>
          ))}
        </InfoCard>
      ) : null}
      <LoadingOverlay visible={processing} message={processingMessage} />
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
  success: { color: colors.success, fontWeight: '900' },
  warning: { color: colors.warning, fontWeight: '900' },
  error: { color: colors.danger },
  cardTitle: { color: colors.text, fontWeight: '900', fontSize: 17 },
  line: { color: colors.textMuted },
  betRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  betEmail: { color: colors.text, fontWeight: '900' },
});
