import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AdminMatchPicker } from '../../components/AdminMatchPicker';
import { AppPopup } from '../../components/AppPopup';
import { InfoCard } from '../../components/InfoCard';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { Screen } from '../../components/Screen';
import { api } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Match } from '../../types/api';

interface MatchBettor {
  user_id: string;
  email: string;
  full_name?: string;
  bet_id: string;
  total_stake: string;
  net_payout: string;
  bet_status: string;
  payment_status: string;
  source: string;
  market_name: string;
  market_type: string;
  selection_key: string;
  selection_label?: string;
  frozen_odds: string;
  payment_state?: string;
  transfer_number?: string;
  sender_bank?: string;
  transfer_review_status?: string;
}

interface FinancialSummary {
  total_staked: string;
  total_user_winnings: string;
  gross_utility: string;
  pending_bets: string;
  active_users: string;
  total_platform_fee?: string;
  total_operator_fee?: string;
  total_retained_commission?: string;
}

export function AdminReportsScreen() {
  const [generalSummary, setGeneralSummary] = useState<FinancialSummary | null>(null);
  const [matchSummary, setMatchSummary] = useState<FinancialSummary | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [bettors, setBettors] = useState<MatchBettor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [popup, setPopup] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    api
      .get<FinancialSummary>('/reports/general-summary')
      .then(setGeneralSummary)
      .catch((err) =>
        setPopup({
          title: 'No se pudo cargar',
          message: err instanceof Error ? err.message : 'No se pudo cargar reporte.',
        }),
      )
      .finally(() => setLoading(false));
  }, []);

  async function loadMatchReport(match: Match) {
    setSelectedMatch(match);
    setMatchSummary(null);
    setBettors([]);
    setLoadingMatch(true);
    try {
      const [summary, matchBettors] = await Promise.all([
        api.get<FinancialSummary>(`/reports/matches/${match.id}/summary`),
        api.get<MatchBettor[]>(`/reports/matches/${match.id}/bettors`),
      ]);
      setMatchSummary(summary);
      setBettors(matchBettors);
    } catch (err) {
      setPopup({
        title: 'No se pudo cargar',
        message: err instanceof Error ? err.message : 'No se pudo cargar el reporte del partido.',
      });
    } finally {
      setLoadingMatch(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Reportes</Text>
        <Text style={styles.subtitle}>Resumen general y detalle financiero por partido.</Text>
      </View>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {generalSummary ? (
        <InfoCard>
          <Text style={styles.sectionTitle}>Reporte general</Text>
          <SummaryRows summary={generalSummary} />
        </InfoCard>
      ) : null}
      <AdminMatchPicker
        selectedMatch={selectedMatch}
        onSelect={(match) => void loadMatchReport(match)}
      />
      {matchSummary ? (
        <InfoCard>
          <Text style={styles.sectionTitle}>Resumen del partido</Text>
          <Text style={styles.matchTitle}>
            {selectedMatch?.home_team_name} vs {selectedMatch?.away_team_name}
          </Text>
          <SummaryRows summary={matchSummary} />
        </InfoCard>
      ) : null}
      <InfoCard>
        <Text style={styles.sectionTitle}>Apostadores por partido</Text>
        {!selectedMatch ? <Text style={styles.empty}>Selecciona un partido para ver apostadores.</Text> : null}
        {selectedMatch && bettors.length === 0 ? <Text style={styles.empty}>No hay apuestas registradas para este partido.</Text> : null}
        {bettors.map((item) => (
          <View key={`${item.bet_id}-${item.selection_key}-${item.payment_state ?? 'no-payment'}`} style={styles.betRow}>
            <Text style={styles.betEmail}>{item.email}</Text>
            <Text style={styles.line}>Pronostico: {item.selection_label ?? item.selection_key}</Text>
            <Text style={styles.line}>Mercado: {item.market_name}</Text>
            <Text style={styles.line}>Apostado: ${Number(item.total_stake).toFixed(2)}</Text>
            <Text style={styles.line}>Posible pago neto: ${Number(item.net_payout).toFixed(2)}</Text>
            <Text style={styles.line}>Apuesta: {item.bet_status}</Text>
            <Text style={item.payment_state === 'confirmed' ? styles.success : styles.warning}>
              Pago: {item.payment_state ?? item.payment_status}
            </Text>
            <Text style={styles.line}>
              Transferencia: {item.transfer_review_status ?? 'sin transferencia'}
            </Text>
            {item.transfer_number ? <Text style={styles.line}>No. transferencia: {item.transfer_number}</Text> : null}
          </View>
        ))}
      </InfoCard>
      <LoadingOverlay visible={loadingMatch} message="Cargando reporte del partido..." />
      <AppPopup
        visible={Boolean(popup)}
        title={popup?.title ?? ''}
        message={popup?.message ?? ''}
        onAccept={() => setPopup(null)}
      />
    </Screen>
  );
}

function SummaryRows({ summary }: { summary: FinancialSummary }) {
  return (
    <>
      <Row label="Total apostado" value={`$${Number(summary.total_staked).toFixed(2)}`} />
      <Row label="Ganancia usuarios" value={`$${Number(summary.total_user_winnings).toFixed(2)}`} />
      <Row label="Utilidad bruta" value={`$${Number(summary.gross_utility).toFixed(2)}`} />
      <Row label="Comision app" value={`$${Number(summary.total_platform_fee ?? 0).toFixed(2)}`} />
      <Row label="Comision operativa" value={`$${Number(summary.total_operator_fee ?? 0).toFixed(2)}`} />
      <Row label="Total retenido comision" value={`$${Number(summary.total_retained_commission ?? 0).toFixed(2)}`} />
      <Row label="Apuestas pendientes" value={String(summary.pending_bets)} />
      <Row label="Usuarios activos" value={String(summary.active_users)} />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  title: { ...typography.title, color: colors.text },
  subtitle: { color: colors.textMuted },
  sectionTitle: { color: colors.text, fontWeight: '900', fontSize: 17 },
  matchTitle: { color: colors.primary, fontWeight: '900' },
  empty: { color: colors.textMuted },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  label: { color: colors.textMuted },
  value: { color: colors.text, fontWeight: '900' },
  betRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  betEmail: { color: colors.text, fontWeight: '900' },
  line: { color: colors.textMuted },
  success: { color: colors.success, fontWeight: '900' },
  warning: { color: colors.warning, fontWeight: '900' },
});
