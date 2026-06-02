import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdminMatchPicker } from '../../components/AdminMatchPicker';
import { AppPopup } from '../../components/AppPopup';
import { Button } from '../../components/Button';
import { InfoCard } from '../../components/InfoCard';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { api } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Match } from '../../types/api';
import { isValidDateMask, maskDate } from '../../utils/inputMasks';

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

interface TotalBetReportRow {
  bet_id: string;
  bet_created_at: string;
  user_name: string;
  email: string;
  match_name: string;
  selection_label: string;
  market_name: string;
  total_stake: string;
  amount_won: string;
  result_status: string;
  payment_review_status: string;
  official_score: string;
}

interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function AdminReportsScreen() {
  const [generalSummary, setGeneralSummary] = useState<FinancialSummary | null>(null);
  const [matchSummary, setMatchSummary] = useState<FinancialSummary | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [bettors, setBettors] = useState<MatchBettor[]>([]);
  const [totalRows, setTotalRows] = useState<TotalBetReportRow[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [totalPage, setTotalPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingTotal, setLoadingTotal] = useState(false);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [popup, setPopup] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    async function loadInitialReports() {
      setLoading(true);
      try {
        const summary = await api.get<FinancialSummary>('/reports/general-summary');
        setGeneralSummary(summary);
        await loadTotalReport(1);
      } catch (err) {
        setPopup({
          title: 'No se pudo cargar',
          message: err instanceof Error ? err.message : 'No se pudo cargar reporte.',
        });
      } finally {
        setLoading(false);
      }
    }

    void loadInitialReports();
  }, []);

  async function loadTotalReport(page = totalPage) {
    setLoadingTotal(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: '20',
      });
      if (fromDate.trim()) query.set('fromDate', fromDate.trim());
      if (toDate.trim()) query.set('toDate', toDate.trim());
      if (fromDate.trim() && !isValidDateMask(fromDate.trim())) {
        throw new Error('La fecha desde debe tener formato YYYY-MM-DD y ser una fecha real.');
      }
      if (toDate.trim() && !isValidDateMask(toDate.trim())) {
        throw new Error('La fecha hasta debe tener formato YYYY-MM-DD y ser una fecha real.');
      }

      const response = await api.get<PaginatedResponse<TotalBetReportRow>>(`/reports/bets?${query.toString()}`);
      setTotalRows(response.items);
      setTotalPage(response.page);
      setTotalPages(response.totalPages);
      setTotalRecords(response.total);
    } catch (err) {
      setPopup({
        title: 'No se pudo cargar',
        message: err instanceof Error ? err.message : 'No se pudo cargar el reporte total.',
      });
    } finally {
      setLoadingTotal(false);
    }
  }

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
      <InfoCard>
        <Text style={styles.sectionTitle}>Reporte total de apuestas</Text>
        <View style={styles.filters}>
          <TextField
            label="Desde YYYY-MM-DD"
            value={fromDate}
            onChangeText={(value) => setFromDate(maskDate(value))}
            autoCapitalize="none"
            keyboardType="number-pad"
            placeholder="YYYY-MM-DD"
            maxLength={10}
          />
          <TextField
            label="Hasta YYYY-MM-DD"
            value={toDate}
            onChangeText={(value) => setToDate(maskDate(value))}
            autoCapitalize="none"
            keyboardType="number-pad"
            placeholder="YYYY-MM-DD"
            maxLength={10}
          />
          <Button title="Filtrar" onPress={() => void loadTotalReport(1)} />
        </View>
        <Text style={styles.empty}>
          Registros: {totalRecords} - Pagina {totalPage} de {totalPages}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={[styles.gridRow, styles.gridHeader]}>
              <GridCell value="Fecha" width={120} header />
              <GridCell value="Usuario" width={170} header />
              <GridCell value="Juego" width={210} header />
              <GridCell value="Eleccion" width={190} header />
              <GridCell value="Aposto" width={90} header />
              <GridCell value="Gano" width={90} header />
              <GridCell value="Resultado" width={100} header />
              <GridCell value="Pago" width={110} header />
              <GridCell value="Marcador oficial" width={130} header />
            </View>
            {totalRows.map((item) => (
              <View key={item.bet_id} style={styles.gridRow}>
                <GridCell value={formatDate(item.bet_created_at)} width={120} />
                <GridCell value={item.user_name || item.email} width={170} />
                <GridCell value={item.match_name} width={210} />
                <GridCell value={`${item.market_name}: ${item.selection_label}`} width={190} />
                <GridCell value={`$${Number(item.total_stake).toFixed(2)}`} width={90} />
                <GridCell value={`$${Number(item.amount_won).toFixed(2)}`} width={90} />
                <GridCell value={item.result_status} width={100} />
                <GridCell value={item.payment_review_status} width={110} />
                <GridCell value={item.official_score} width={130} />
              </View>
            ))}
            {!loadingTotal && totalRows.length === 0 ? (
              <Text style={styles.emptyGrid}>No hay apuestas para el filtro seleccionado.</Text>
            ) : null}
          </View>
        </ScrollView>
        <View style={styles.pagination}>
          <Button
            title="Anterior"
            variant="secondary"
            onPress={() => void loadTotalReport(Math.max(1, totalPage - 1))}
            disabled={totalPage <= 1}
          />
          <Button
            title="Siguiente"
            variant="secondary"
            onPress={() => void loadTotalReport(Math.min(totalPages, totalPage + 1))}
            disabled={totalPage >= totalPages}
          />
        </View>
      </InfoCard>
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
      <LoadingOverlay
        visible={loadingMatch || loadingTotal}
        message={loadingTotal ? 'Cargando reporte total...' : 'Cargando reporte del partido...'}
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

function GridCell({
  value,
  width,
  header,
}: {
  value: string;
  width: number;
  header?: boolean;
}) {
  return (
    <Text style={[styles.gridCell, { width }, header ? styles.gridCellHeader : null]} numberOfLines={3}>
      {value}
    </Text>
  );
}

function formatDate(value: string) {
  return new Date(value).toISOString().slice(0, 10);
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
  filters: { gap: spacing.md },
  pagination: { flexDirection: 'row', gap: spacing.sm },
  gridRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gridHeader: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  gridCell: {
    minHeight: 52,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    padding: spacing.sm,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  gridCellHeader: {
    color: colors.text,
    fontWeight: '900',
  },
  emptyGrid: {
    color: colors.textMuted,
    padding: spacing.md,
  },
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
