import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Match } from '../types/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { StatusChip } from './StatusChip';

interface MatchCardProps {
  match: Match;
  onPress: () => void;
}

export function MatchCard({ match, onPress }: MatchCardProps) {
  const hasResult = match.home_score !== null && match.home_score !== undefined && match.away_score !== null && match.away_score !== undefined;
  const isFinal = match.status === 'finished' || match.is_past_or_finished;
  const kickoffTime =
    match.kickoff_local_time ??
    new Date(match.kickoff_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const closesTime =
    match.betting_closes_local_time ??
    new Date(match.betting_closes_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const userResultMessage = getUserResultMessage(match.user_bet_result);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.time}>
          {kickoffTime}
        </Text>
        <StatusChip
          label={isFinal ? 'Finalizado' : match.accepts_bets ? 'Apuestas abiertas' : 'Cerrado'}
          tone={isFinal ? 'neutral' : match.accepts_bets ? 'success' : 'danger'}
        />
      </View>
      <Text style={styles.teams}>{match.home_team_name} vs {match.away_team_name}</Text>
      {isFinal ? (
        <View style={styles.resultRow}>
          <Text style={styles.score}>
            {hasResult ? `${match.home_score} - ${match.away_score}` : 'Resultado pendiente'}
          </Text>
          {hasResult && userResultMessage ? (
            <Text style={match.user_bet_result === 'won' ? styles.winMessage : styles.lossMessage}>
              {userResultMessage}
            </Text>
          ) : null}
        </View>
      ) : null}
      <Text style={styles.meta}>{match.venue_name} - {match.venue_city}</Text>
      <Text style={styles.meta}>Hora Ecuador: {kickoffTime}</Text>
      {!isFinal ? <Text style={styles.close}>Cierre: {closesTime}</Text> : null}
    </Pressable>
  );
}

function getUserResultMessage(result?: 'won' | 'lost' | null) {
  if (result === 'won') return 'felicidades eres el ganador';
  if (result === 'lost') return 'sigue la proxima sera tu suerte';
  return null;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    alignItems: 'center',
  },
  time: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  teams: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 14,
  },
  score: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  winMessage: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '900',
    flex: 1,
    textAlign: 'right',
  },
  lossMessage: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '900',
    flex: 1,
    textAlign: 'right',
  },
  close: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '700',
  },
});
