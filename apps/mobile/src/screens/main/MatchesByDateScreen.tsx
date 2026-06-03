import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MatchCard } from '../../components/MatchCard';
import { Screen } from '../../components/Screen';
import { api } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Match } from '../../types/api';
import { AppScreenProps } from '../../navigation/types';

export function MatchesByDateScreen({ navigation, route }: AppScreenProps<'MatchesByDate'>) {
  const { date } = route.params;
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    api
      .get<Match[]>(`/matches/by-date?date=${date}&timezone=${encodeURIComponent(timezone)}`)
      .then(setMatches)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar partidos.'))
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Partidos</Text>
        <Text style={styles.subtitle}>{date}</Text>
      </View>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && matches.length === 0 ? <Text style={styles.empty}>No hay partidos cargados para esta fecha.</Text> : null}

      <View style={styles.list}>
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onPress={() => navigation.navigate('MatchDetail', { matchId: match.id })}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  list: {
    gap: spacing.md,
  },
  error: {
    color: colors.danger,
  },
  empty: {
    color: colors.textMuted,
  },
});
