import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppPopup } from '../../components/AppPopup';
import { Button } from '../../components/Button';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { PasswordField } from '../../components/PasswordField';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPasswordConfirm'>;

export function ConfirmResetPasswordScreen({ navigation, route }: Props) {
  const { confirmResetPassword } = useAuth();
  const [email] = useState(route.params.email);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{ title: string; message: string; done?: boolean } | null>(null);

  async function submit() {
    setPopup(null);
    if (newPassword.length < 6) {
      setPopup({ title: 'Clave invalida', message: 'La nueva clave debe tener al menos 6 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPopup({ title: 'Claves distintas', message: 'La confirmacion de clave no coincide.' });
      return;
    }

    setLoading(true);
    try {
      await confirmResetPassword(email, code.trim(), newPassword);
      setPopup({
        title: 'Clave actualizada',
        message: 'Tu clave fue actualizada correctamente. Ahora puedes iniciar sesion.',
        done: true,
      });
    } catch (err) {
      setPopup({
        title: 'No se pudo actualizar',
        message: err instanceof Error ? err.message : 'No se pudo actualizar la clave.',
      });
    } finally {
      setLoading(false);
    }
  }

  function acceptPopup() {
    const done = popup?.done;
    setPopup(null);
    if (done) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Nueva clave</Text>
        <Text style={styles.subtitle}>Ingresa el codigo enviado a {email} y registra tu nueva clave.</Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="Codigo recibido"
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
          keyboardType="number-pad"
        />
        <PasswordField label="Nueva clave" value={newPassword} onChangeText={setNewPassword} />
        <PasswordField label="Confirmar nueva clave" value={confirmPassword} onChangeText={setConfirmPassword} />
        <Button
          title="Actualizar clave"
          onPress={submit}
          loading={loading}
          disabled={!code || newPassword.length < 6 || !confirmPassword || loading}
        />
      </View>

      <LoadingOverlay visible={loading} message="Actualizando clave..." />
      <AppPopup
        visible={Boolean(popup)}
        title={popup?.title ?? ''}
        message={popup?.message ?? ''}
        onAccept={acceptPopup}
      />
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
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
  form: {
    gap: spacing.md,
  },
});
