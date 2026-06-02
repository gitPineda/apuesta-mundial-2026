import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppPopup } from '../../components/AppPopup';
import { Button } from '../../components/Button';
import { InfoCard } from '../../components/InfoCard';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { api } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export function AdminCreateMatchScreen() {
  const [matchKind, setMatchKind] = useState<'normal' | 'elimination' | 'final'>('normal');
  const [homeTeamCode, setHomeTeamCode] = useState('ECU');
  const [homeTeamName, setHomeTeamName] = useState('Ecuador');
  const [awayTeamCode, setAwayTeamCode] = useState('');
  const [awayTeamName, setAwayTeamName] = useState('');
  const [kickoffDateEc, setKickoffDateEc] = useState('');
  const [kickoffTimeEc, setKickoffTimeEc] = useState('');
  const [venueName, setVenueName] = useState('Sede por confirmar');
  const [venueCity, setVenueCity] = useState('');
  const [venueCountry, setVenueCountry] = useState('United States');
  const [venueTimezone, setVenueTimezone] = useState('America/New_York');
  const [tournamentName, setTournamentName] = useState('Partidos especiales');
  const [phase, setPhase] = useState('special');
  const [bettingCutoffMinutes, setBettingCutoffMinutes] = useState('60');
  const [homeWinOdds, setHomeWinOdds] = useState('');
  const [drawOdds, setDrawOdds] = useState('');
  const [awayWinOdds, setAwayWinOdds] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit() {
    setError('');
    setSuccess('');
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    setLoading(true);
    try {
      const match = await api.post<{ id: string }>('/admin/matches', {
        matchKind,
        homeTeamCode,
        homeTeamName,
        awayTeamCode,
        awayTeamName,
        kickoffDateEc,
        kickoffTimeEc,
        venueName,
        venueCity,
        venueCountry,
        venueTimezone,
        tournamentName,
        phase,
        bettingCutoffMinutes: Number(bettingCutoffMinutes),
        bettingEnabled: true,
        homeWinOdds: Number(homeWinOdds),
        drawOdds: matchKind === 'normal' ? Number(drawOdds) : undefined,
        awayWinOdds: Number(awayWinOdds),
      });
      setSuccess(`Partido guardado correctamente. ID: ${match.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el partido.');
    } finally {
      setLoading(false);
    }
  }

  function validate() {
    if (!homeTeamCode.trim() || !homeTeamName.trim() || !awayTeamCode.trim() || !awayTeamName.trim()) {
      return 'Completa los datos de ambos equipos.';
    }
    if (homeTeamCode.trim().toUpperCase() === awayTeamCode.trim().toUpperCase()) {
      return 'Los equipos deben ser diferentes.';
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(kickoffDateEc)) {
      return 'La fecha debe tener formato YYYY-MM-DD.';
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(kickoffTimeEc)) {
      return 'La hora Ecuador debe tener formato HH:mm.';
    }
    if (!venueName.trim() || !venueCity.trim() || !venueCountry.trim() || !venueTimezone.trim()) {
      return 'Completa los datos de la sede.';
    }
    const oddsToValidate = matchKind === 'normal' ? [homeWinOdds, drawOdds, awayWinOdds] : [homeWinOdds, awayWinOdds];
    if (oddsToValidate.some((value) => Number(value) < 1 || Number.isNaN(Number(value)))) {
      return 'Las cuotas deben ser numeros mayores o iguales a 1.';
    }
    if (Number(bettingCutoffMinutes) < 0 || Number.isNaN(Number(bettingCutoffMinutes))) {
      return 'El cierre de apuestas debe ser un numero mayor o igual a 0.';
    }
    return '';
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Nuevo partido</Text>
        <Text style={styles.subtitle}>Crea partidos especiales y sus mercados de apuesta.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <InfoCard>
        <Text style={styles.cardTitle}>Equipos</Text>
        <View style={styles.grid}>
          <TextField label="Codigo local" value={homeTeamCode} onChangeText={setHomeTeamCode} autoCapitalize="characters" />
          <TextField label="Equipo local" value={homeTeamName} onChangeText={setHomeTeamName} />
          <TextField label="Codigo visitante" value={awayTeamCode} onChangeText={setAwayTeamCode} autoCapitalize="characters" />
          <TextField label="Equipo visitante" value={awayTeamName} onChangeText={setAwayTeamName} />
        </View>
      </InfoCard>

      <InfoCard>
        <Text style={styles.cardTitle}>Fecha y sede</Text>
        <View style={styles.grid}>
          <TextField label="Fecha Ecuador YYYY-MM-DD" value={kickoffDateEc} onChangeText={setKickoffDateEc} />
          <TextField label="Hora Ecuador HH:mm" value={kickoffTimeEc} onChangeText={setKickoffTimeEc} />
          <TextField label="Estadio / sede" value={venueName} onChangeText={setVenueName} />
          <TextField label="Ciudad" value={venueCity} onChangeText={setVenueCity} />
          <TextField label="Pais" value={venueCountry} onChangeText={setVenueCountry} />
          <TextField label="Zona horaria sede" value={venueTimezone} onChangeText={setVenueTimezone} />
        </View>
      </InfoCard>

      <InfoCard>
        <Text style={styles.cardTitle}>Clasificacion</Text>
        <View style={styles.grid}>
          <View style={styles.segment}>
            <Button
              title="Partido normal"
              variant={matchKind === 'normal' ? 'primary' : 'secondary'}
              onPress={() => setMatchKind('normal')}
            />
            <Button
              title="Eliminacion directa"
              variant={matchKind === 'elimination' ? 'primary' : 'secondary'}
              onPress={() => setMatchKind('elimination')}
            />
            <Button
              title="Final"
              variant={matchKind === 'final' ? 'primary' : 'secondary'}
              onPress={() => setMatchKind('final')}
            />
          </View>
          <TextField label="Torneo / categoria" value={tournamentName} onChangeText={setTournamentName} />
          <TextField label="Fase" value={phase} onChangeText={setPhase} />
          <TextField label="Cierre antes del partido, minutos" value={bettingCutoffMinutes} onChangeText={setBettingCutoffMinutes} keyboardType="numeric" />
        </View>
      </InfoCard>

      <InfoCard>
        <Text style={styles.cardTitle}>{marketTitle(matchKind)}</Text>
        <View style={styles.grid}>
          <TextField
            label={homeOddsLabel(matchKind)}
            value={homeWinOdds}
            onChangeText={setHomeWinOdds}
            keyboardType="decimal-pad"
          />
          {matchKind === 'normal' ? (
            <TextField label="Cuota empate" value={drawOdds} onChangeText={setDrawOdds} keyboardType="decimal-pad" />
          ) : null}
          <TextField
            label={awayOddsLabel(matchKind)}
            value={awayWinOdds}
            onChangeText={setAwayWinOdds}
            keyboardType="decimal-pad"
          />
        </View>
      </InfoCard>

      <Button title="Guardar partido" onPress={submit} loading={loading} />

      <AppPopup
        visible={Boolean(success)}
        title="Partido guardado"
        message={success}
        onAccept={() => setSuccess('')}
      />
    </Screen>
  );
}

function marketTitle(matchKind: 'normal' | 'elimination' | 'final') {
  if (matchKind === 'final') return 'Ganador del titulo';
  if (matchKind === 'elimination') return 'Ganador del partido';
  return 'Resultado simple';
}

function homeOddsLabel(matchKind: 'normal' | 'elimination' | 'final') {
  if (matchKind === 'final') return 'Cuota campeon local';
  if (matchKind === 'elimination') return 'Cuota ganador local';
  return 'Cuota gana local';
}

function awayOddsLabel(matchKind: 'normal' | 'elimination' | 'final') {
  if (matchKind === 'final') return 'Cuota campeon visitante';
  if (matchKind === 'elimination') return 'Cuota ganador visitante';
  return 'Cuota gana visitante';
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
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  grid: {
    gap: spacing.md,
  },
  error: {
    color: colors.danger,
  },
  segment: {
    gap: spacing.sm,
  },
});
