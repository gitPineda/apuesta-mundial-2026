import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { AppStackParamList } from '../../navigation/types';
import { api } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { MatchDateSummary } from '../../types/api';

export function CalendarScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [dates, setDates] = useState<MatchDateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<MatchDateSummary[]>('/matches/available-dates', false)
      .then(setDates)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el calendario.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Calendario</Text>
        <Text style={styles.subtitle}>Partidos disponibles para apostar. Horarios en Ecuador.</Text>
      </View>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error && dates.length === 0 ? (
        <Text style={styles.empty}>No hay fechas con partidos cargados.</Text>
      ) : null}

      {!loading && !error && dates.length > 0 ? (
        <DateSection
          title="Fechas con partidos"
          dates={dates}
          onSelect={(date) => navigation.navigate('MatchesByDate', { date })}
        />
      ) : null}
    </Screen>
  );
}

function DateSection({
  title,
  dates,
  onSelect,
}: {
  title: string;
  dates: MatchDateSummary[];
  onSelect: (date: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.list}>
        {dates.map((item) => {
          const itemDate = new Date(`${item.date}T12:00:00Z`);
          return (
            <Pressable
              key={item.date}
              style={styles.dateRow}
              onPress={() => onSelect(item.date)}
            >
              <View>
                <Text style={styles.dateTitle}>
                  {itemDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
                <Text style={styles.dateText}>
                  {item.date} - {item.match_count} {item.match_count === 1 ? 'partido' : 'partidos'}
                </Text>
              </View>
              <Text style={styles.arrow}>Ver</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
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
    lineHeight: 20,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  list: {
    gap: spacing.md,
  },
  dateRow: {
    minHeight: 68,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  dateTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 15,
    textTransform: 'capitalize',
  },
  dateText: {
    color: colors.textMuted,
    marginTop: 4,
  },
  arrow: {
    color: colors.primary,
    fontWeight: '800',
  },
  error: {
    color: colors.danger,
  },
  empty: {
    color: colors.textMuted,
  },
});
