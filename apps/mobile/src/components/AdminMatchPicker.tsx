import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { Match } from '../types/api';
import { Button } from './Button';
import { InfoCard } from './InfoCard';
import { TextField } from './TextField';

interface AdminMatchPickerProps {
  selectedMatch?: Match | null;
  onSelect: (match: Match) => void;
}

export function AdminMatchPicker({ selectedMatch, onSelect }: AdminMatchPickerProps) {
  const [date, setDate] = useState('2026-06-11');
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      setMatches(await api.get<Match[]>(`/matches/by-date?date=${date}&timezone=America%2FGuayaquil`, false));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar partidos.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <InfoCard>
      <Text style={styles.title}>Seleccionar partido</Text>
      <View style={styles.row}>
        <View style={styles.inputWrap}>
          <TextField label="Fecha Ecuador" value={date} onChangeText={setDate} />
        </View>
        <View style={styles.buttonWrap}>
          <Button title="Buscar" onPress={load} />
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {selectedMatch ? (
        <Text style={styles.selected}>
          Seleccionado: {selectedMatch.home_team_name} vs {selectedMatch.away_team_name}
        </Text>
      ) : null}
      <View style={styles.list}>
        {matches.map((match) => (
          <Pressable key={match.id} style={styles.matchRow} onPress={() => onSelect(match)}>
            <Text style={styles.matchTitle}>{match.home_team_name} vs {match.away_team_name}</Text>
            <Text style={styles.matchMeta}>{match.kickoff_local_time} - {match.venue_city}</Text>
          </Pressable>
        ))}
      </View>
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 17,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-end',
  },
  inputWrap: {
    flex: 1,
  },
  buttonWrap: {
    minWidth: 96,
  },
  error: {
    color: colors.danger,
  },
  selected: {
    color: colors.primary,
    fontWeight: '900',
  },
  list: {
    gap: spacing.sm,
  },
  matchRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.xs,
  },
  matchTitle: {
    color: colors.text,
    fontWeight: '800',
  },
  matchMeta: {
    color: colors.textMuted,
  },
});
