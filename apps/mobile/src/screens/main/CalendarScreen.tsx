import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { AppStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

function buildDateRange(start: string, end: string) {
  const dates: string[] = [];
  const current = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);

  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

const specialDates = ['2026-05-30'];
const worldCupDates = buildDateRange('2026-06-11', '2026-06-27');

export function CalendarScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Calendario</Text>
        <Text style={styles.subtitle}>Partidos disponibles para apostar. Horarios en Ecuador.</Text>
      </View>

      <DateSection title="Partidos especiales" dates={specialDates} onSelect={(date) => navigation.navigate('MatchesByDate', { date })} />
      <DateSection title="ASERBIESS Mundial 2026" dates={worldCupDates} onSelect={(date) => navigation.navigate('MatchesByDate', { date })} />
    </Screen>
  );
}

function DateSection({ title, dates, onSelect }: { title: string; dates: string[]; onSelect: (date: string) => void }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.list}>
        {dates.map((date) => {
          const itemDate = new Date(`${date}T12:00:00Z`);
          return (
            <Pressable
              key={date}
              style={styles.dateRow}
              onPress={() => onSelect(date)}
            >
              <View>
                <Text style={styles.dateTitle}>
                  {itemDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
                <Text style={styles.dateText}>{date}</Text>
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
});
