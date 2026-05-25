import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppPopup } from '../../components/AppPopup';
import { Button } from '../../components/Button';
import { InfoCard } from '../../components/InfoCard';
import { LoadingOverlay } from '../../components/LoadingOverlay';
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
  const [saving, setSaving] = useState(false);
  const [popup, setPopup] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username ?? '');
    setFullName(profile.full_name ?? '');
    setBirthDate(profile.birth_date ?? '');
    setPhone(profile.phone ?? '');
  }, [profile]);

  async function saveProfile() {
    setSaving(true);
    try {
      if (!username.trim() || !fullName.trim() || !birthDate.trim() || !phone.trim()) {
        setPopup({ title: 'Perfil incompleto', message: 'Completa usuario, nombre, fecha de nacimiento y telefono.' });
        return;
      }
      if (!isValidBirthDate(birthDate)) {
        setPopup({ title: 'Fecha invalida', message: 'Usa el formato YYYY-MM-DD y una fecha real.' });
        return;
      }
      if (!isValidPhone(phone)) {
        setPopup({ title: 'Telefono invalido', message: 'Ingresa un telefono de 7 a 15 digitos.' });
        return;
      }
      await api.patch('/me/profile', { username, fullName, birthDate, phone });
      await api.post('/me/accept-terms', { termsVersion: 'mvp-2026-01' });
      const updatedProfile = await refreshProfile();
      if (updatedProfile?.profile_completed) {
        setPopup({ title: 'Perfil guardado', message: 'Perfil completado correctamente.' });
        return;
      }
      setPopup({
        title: 'Perfil pendiente',
        message: 'Perfil guardado, pero aun no cumple los requisitos para continuar. Verifica la mayoria de edad y los datos obligatorios.',
      });
    } catch (err) {
      setPopup({
        title: 'No se pudo guardar',
        message: err instanceof Error ? err.message : 'No se pudo guardar el perfil.',
      });
    } finally {
      setSaving(false);
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
        <Button title="Guardar perfil" onPress={saveProfile} loading={saving} />
      </InfoCard>

      <Button title="Cerrar sesion" variant="danger" onPress={signOut} />
      <LoadingOverlay visible={saving} message="Guardando perfil..." />
      <AppPopup
        visible={Boolean(popup)}
        title={popup?.title ?? ''}
        message={popup?.message ?? ''}
        onAccept={() => setPopup(null)}
      />
    </Screen>
  );
}

function isValidBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
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
});
