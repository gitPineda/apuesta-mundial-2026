import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { ErrorText } from '../../components/ErrorText';
import { InfoCard } from '../../components/InfoCard';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export function ProfileScreen() {
  const { profile, profileComplete, refreshProfile, signOut, user } = useAuth();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username ?? '');
    setFullName(profile.full_name ?? '');
    setBirthDate(profile.birth_date ?? '');
    setPhone(profile.phone ?? '');
  }, [profile]);

  async function saveProfile() {
    setError('');
    setMessage('');
    try {
      if (!username.trim() || !fullName.trim() || !birthDate.trim() || !phone.trim()) {
        setError('Completa usuario, nombre, fecha de nacimiento y telefono.');
        return;
      }
      await api.patch('/me/profile', { username, fullName, birthDate, phone });
      await api.post('/me/accept-terms', { termsVersion: 'mvp-2026-01' });
      const updatedProfile = await refreshProfile();
      if (updatedProfile?.profile_completed) {
        setMessage('Perfil completado correctamente.');
        return;
      }
      setError('Perfil guardado, pero aun no cumple los requisitos para continuar. Verifica la mayoria de edad y los datos obligatorios.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el perfil.');
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
        <Text style={styles.subtitle}>{user?.email}</Text>
        <Text style={styles.roles}>Rol: {user?.roles?.join(', ') ?? 'user'}</Text>
        {!profileComplete ? (
          <Text style={styles.required}>
            Completa esta informacion para continuar usando la app.
          </Text>
        ) : null}
      </View>

      <InfoCard>
        <TextField label="Usuario" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <TextField label="Nombre completo" value={fullName} onChangeText={setFullName} />
        <TextField label="Fecha de nacimiento YYYY-MM-DD" value={birthDate} onChangeText={setBirthDate} />
        <TextField label="Telefono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Text style={styles.hint}>Debes ser mayor de edad y aceptar terminos para poder apostar.</Text>
        <ErrorText message={error} />
        {message ? <Text style={styles.success}>{message}</Text> : null}
        <Button title="Guardar perfil" onPress={saveProfile} />
      </InfoCard>

      <Button title="Cerrar sesion" variant="danger" onPress={signOut} />
    </Screen>
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
  },
  roles: {
    color: colors.primary,
    fontWeight: '900',
  },
  required: {
    color: colors.warning,
    fontWeight: '800',
    lineHeight: 20,
  },
  hint: {
    color: colors.warning,
    lineHeight: 20,
  },
  success: {
    color: colors.success,
    fontWeight: '800',
  },
});
