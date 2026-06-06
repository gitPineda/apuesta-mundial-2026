import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppPopup } from '../../components/AppPopup';
import { Button } from '../../components/Button';
import { InfoCard } from '../../components/InfoCard';
import { Screen } from '../../components/Screen';
import { api } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface ActiveSession {
  id: string;
  username: string;
  email: string;
  full_name?: string | null;
  active_session_started_at?: string | null;
  active_session_expires_at?: string | null;
  roles?: string[];
}

export function AdminSessionsScreen() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [popup, setPopup] = useState<{ title: string; message: string } | null>(null);

  const loadSessions = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .get<ActiveSession[]>('/admin/users/sessions')
      .then(setSessions)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar sesiones.'))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(loadSessions);

  async function forceLogout(userId: string) {
    setActionId(userId);
    try {
      await api.post(`/admin/users/${userId}/logout`);
      setSessions((current) => current.filter((session) => session.id !== userId));
      setPopup({ title: 'Sesion cerrada', message: 'El usuario debera iniciar sesion nuevamente.' });
    } catch (err) {
      setPopup({
        title: 'No se pudo cerrar',
        message: err instanceof Error ? err.message : 'No se pudo cerrar la sesion.',
      });
    } finally {
      setActionId(null);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Sesiones activas</Text>
        <Text style={styles.subtitle}>Cierra sesiones remotas cuando un usuario no puede ingresar.</Text>
      </View>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && sessions.length === 0 ? <Text style={styles.empty}>No hay sesiones activas.</Text> : null}

      <View style={styles.list}>
        {sessions.map((session) => (
          <InfoCard key={session.id}>
            <Text style={styles.name}>{session.full_name || session.username}</Text>
            <Text style={styles.meta}>{session.email}</Text>
            <Text style={styles.meta}>Roles: {session.roles?.join(', ') || '-'}</Text>
            <Text style={styles.meta}>
              Inicio: {formatDate(session.active_session_started_at)}
            </Text>
            <Text style={styles.meta}>
              Expira: {formatDate(session.active_session_expires_at)}
            </Text>
            <Button
              title="Cerrar sesion"
              variant="secondary"
              loading={actionId === session.id}
              disabled={Boolean(actionId)}
              onPress={() => forceLogout(session.id)}
            />
          </InfoCard>
        ))}
      </View>

      <AppPopup
        visible={Boolean(popup)}
        title={popup?.title ?? ''}
        message={popup?.message ?? ''}
        onAccept={() => setPopup(null)}
      />
    </Screen>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
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
  list: {
    gap: spacing.md,
  },
  name: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 17,
  },
  meta: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  error: {
    color: colors.danger,
  },
  empty: {
    color: colors.textMuted,
  },
});
