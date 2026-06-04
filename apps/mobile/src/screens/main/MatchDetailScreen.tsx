import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { InfoCard } from '../../components/InfoCard';
import { Screen } from '../../components/Screen';
import { StatusChip } from '../../components/StatusChip';
import { api } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Market, Match } from '../../types/api';
import { AppScreenProps } from '../../navigation/types';

export function MatchDetailScreen({ navigation, route }: AppScreenProps<'MatchDetail'>) {
  const { matchId } = route.params;
  const [match, setMatch] = useState<Match | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedScores, setSelectedScores] = useState<Record<string, { home: number; away: number }>>({});
  const [selectedMarketType, setSelectedMarketType] = useState('match_winner');

  useEffect(() => {
    Promise.all([
      api.get<Match>(`/matches/${matchId}`),
      api.get<Market[]>(`/matches/${matchId}/markets`, false),
    ])
      .then(([nextMatch, nextMarkets]) => {
        setMatch(nextMatch);
        setMarkets(nextMarkets);
        const availableTypes = getAvailableMarketTypes(nextMarkets);
        setSelectedMarketType(availableTypes.some((mode) => mode.type === 'match_winner') ? 'match_winner' : availableTypes[0]?.type ?? 'match_winner');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el partido.'))
      .finally(() => setLoading(false));
  }, [matchId]);

  if (loading) {
    return <Screen><ActivityIndicator color={colors.primary} /></Screen>;
  }

  if (!match) {
    return <Screen><Text style={styles.error}>{error || 'Partido no encontrado.'}</Text></Screen>;
  }

  const kickoffDate = match.kickoff_local_date ?? new Date(match.kickoff_at).toLocaleDateString();
  const hasResult = match.home_score !== null && match.home_score !== undefined && match.away_score !== null && match.away_score !== undefined;
  const isFinal = match.status === 'finished' || match.is_past_or_finished;
  const kickoffTime =
    match.kickoff_local_time ??
    new Date(match.kickoff_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const closesTime =
    match.betting_closes_local_time ??
    new Date(match.betting_closes_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Screen>
      <InfoCard>
        <StatusChip
          label={isFinal ? 'Finalizado' : match.accepts_bets ? 'Apuestas abiertas' : 'Cerrado'}
          tone={isFinal ? 'neutral' : match.accepts_bets ? 'success' : 'danger'}
        />
        <Text style={styles.title}>{match.home_team_name} vs {match.away_team_name}</Text>
        {isFinal ? (
          <Text style={styles.score}>
            {hasResult ? `${match.home_score} - ${match.away_score}` : 'Resultado pendiente'}
          </Text>
        ) : null}
        <Text style={styles.meta}>
          {kickoffDate} - {kickoffTime} Hora Ecuador
        </Text>
        <Text style={styles.meta}>{match.venue_name} - {match.venue_city}</Text>
        {!isFinal ? <Text style={styles.close}>Apuestas hasta {closesTime}</Text> : null}
        {!isFinal && !match.accepts_bets ? <Text style={styles.closed}>Ya no se aceptan apuestas para este partido.</Text> : null}
      </InfoCard>

      {!isFinal ? <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mercados</Text>
        <View style={styles.marketOptions}>
          {getAvailableMarketTypes(markets).map((mode) => {
            const modeMarkets = markets.filter((market) => market.type === mode.type);

            return (
              <View key={mode.type} style={styles.marketOptionBlock}>
                <RadioOption
                  label={mode.label}
                  selected={selectedMarketType === mode.type}
                  onPress={() => setSelectedMarketType(mode.type)}
                />
                {selectedMarketType === mode.type ? (
                  <View style={styles.selectedMarketContent}>
                    {modeMarkets.map((market) => (
                      <MarketCard
                        key={market.id}
                        market={market}
                        match={match}
                        selectedScore={selectedScores[market.id] ?? { home: 0, away: 0 }}
                        onScoreChange={(value) =>
                          setSelectedScores((current) => ({ ...current, [market.id]: value }))
                        }
                        onSelectOdd={(odd) =>
                          navigation.navigate('CreateBet', {
                            matchId: match.id,
                            oddsId: odd.id,
                            selectionLabel: odd.selectionLabel,
                          })
                        }
                      />
                    ))}
                    {modeMarkets.length === 0 ? (
                      <Text style={styles.emptyMarket}>No hay cuotas disponibles para esta opcion.</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </View> : null}
    </Screen>
  );
}

function RadioOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.radioOption, selected && styles.radioOptionActive]} onPress={onPress}>
      <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
      <Text style={[styles.radioLabel, selected && styles.radioLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function getAvailableMarketTypes(markets: Market[]) {
  const priority = ['match_winner', 'final_winner', 'exact_score'];
  return priority
    .map((type) => {
      const market = markets.find((item) => item.type === type);
      if (!market) return null;
      return {
        type,
        label: type === 'exact_score' ? 'Resultado por marcador' : market.name,
      };
    })
    .filter((item): item is { type: string; label: string } => Boolean(item));
}

function MarketCard({
  market,
  match,
  selectedScore,
  onScoreChange,
  onSelectOdd,
}: {
  market: Market;
  match: Match;
  selectedScore: { home: number; away: number };
  onScoreChange: (value: { home: number; away: number }) => void;
  onSelectOdd: (odd: Market['odds'][number]) => void;
}) {
  return (
    <InfoCard>
      <Text style={styles.marketTitle}>{market.name}</Text>
      {market.type === 'exact_score' ? (
        <ExactScorePicker
          market={market}
          match={match}
          value={selectedScore}
          onChange={onScoreChange}
          onSelect={onSelectOdd}
        />
      ) : (
        <View style={styles.oddsGrid}>
          {market.odds.map((odd) => (
            <Pressable
              key={odd.id}
              style={[styles.odd, !match.accepts_bets && styles.oddDisabled]}
              disabled={!match.accepts_bets}
              onPress={() => onSelectOdd(odd)}
            >
              <Text style={styles.oddLabel}>{odd.selectionLabel}</Text>
              <Text style={styles.oddValue}>{Number(odd.decimalOdds).toFixed(2)}x</Text>
            </Pressable>
          ))}
        </View>
      )}
    </InfoCard>
  );
}

function ExactScorePicker({
  market,
  match,
  value,
  onChange,
  onSelect,
}: {
  market: Market;
  match: Match;
  value: { home: number; away: number };
  onChange: (value: { home: number; away: number }) => void;
  onSelect: (odd: Market['odds'][number]) => void;
}) {
  const selectedKey = `score_${value.home}_${value.away}`;
  const selectedOdd = market.odds.find((odd) => odd.selectionKey === selectedKey);
  const scores = [0, 1, 2, 3, 4, 5];

  return (
    <View style={styles.exactWrapper}>
      <View style={styles.scoreSelectors}>
        <View style={styles.scoreColumn}>
          <Text style={styles.scoreTeam}>{match.home_team_name}</Text>
          <View style={styles.scoreNumbers}>
            {scores.map((score) => (
              <Pressable
                key={`home-${score}`}
                style={[styles.scoreNumber, value.home === score && styles.scoreNumberActive]}
                onPress={() => onChange({ ...value, home: score })}
              >
                <Text style={[styles.scoreNumberText, value.home === score && styles.scoreNumberTextActive]}>{score}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.scoreColumn}>
          <Text style={styles.scoreTeam}>{match.away_team_name}</Text>
          <View style={styles.scoreNumbers}>
            {scores.map((score) => (
              <Pressable
                key={`away-${score}`}
                style={[styles.scoreNumber, value.away === score && styles.scoreNumberActive]}
                onPress={() => onChange({ ...value, away: score })}
              >
                <Text style={[styles.scoreNumberText, value.away === score && styles.scoreNumberTextActive]}>{score}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <Pressable
        style={[styles.odd, !selectedOdd && styles.oddDisabled]}
        disabled={!selectedOdd}
        onPress={() => selectedOdd && onSelect(selectedOdd)}
      >
        <Text style={styles.oddLabel}>
          {selectedOdd?.selectionLabel ?? 'Marcador no disponible'}
        </Text>
        <Text style={styles.oddValue}>
          {selectedOdd ? `${Number(selectedOdd.decimalOdds).toFixed(2)}x` : '--'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.title,
    color: colors.text,
  },
  meta: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  score: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0,
  },
  close: {
    color: colors.warning,
    fontWeight: '800',
  },
  closed: {
    color: colors.danger,
    fontWeight: '800',
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
  },
  marketOptions: {
    gap: spacing.sm,
  },
  marketOptionBlock: {
    gap: spacing.sm,
  },
  selectedMarketContent: {
    gap: spacing.sm,
  },
  radioOption: {
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  radioOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.chip,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioLabel: {
    color: colors.text,
    fontWeight: '800',
  },
  radioLabelActive: {
    color: colors.primary,
  },
  emptyMarket: {
    color: colors.textMuted,
  },
  marketTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
  oddsGrid: {
    gap: spacing.sm,
  },
  odd: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  exactWrapper: {
    gap: spacing.md,
  },
  scoreSelectors: {
    gap: spacing.md,
  },
  scoreColumn: {
    gap: spacing.sm,
  },
  scoreTeam: {
    color: colors.text,
    fontWeight: '800',
  },
  scoreNumbers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scoreNumber: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  scoreNumberActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  scoreNumberText: {
    color: colors.text,
    fontWeight: '900',
  },
  scoreNumberTextActive: {
    color: '#FFFFFF',
  },
  oddDisabled: {
    opacity: 0.5,
  },
  oddLabel: {
    color: colors.text,
    fontWeight: '700',
    flex: 1,
  },
  oddValue: {
    color: colors.primary,
    fontWeight: '900',
  },
  error: {
    color: colors.danger,
  },
});
