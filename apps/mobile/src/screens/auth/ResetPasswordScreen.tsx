import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppPopup } from '../../components/AppPopup';
import { Button } from '../../components/Button';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen({ navigation }: Props) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{ title: string; message: string; next?: 'confirm' } | null>(null);

  async function submit() {
    setPopup(null);
    setLoading(true);
    const cleanEmail = email.trim();
    console.log(`[auth.resetPassword] start email=${cleanEmail}`);
    try {
      await resetPassword(cleanEmail);
      console.log(`[auth.resetPassword] success email=${cleanEmail}`);
      setSentEmail(cleanEmail);
      setPopup({
        title: 'Codigo enviado',
        message: 'Te enviamos un codigo de recuperacion al correo. Ingresa ese codigo y tu nueva clave en el siguiente paso.',
        next: 'confirm',
      });
    } catch (err) {
      console.log(
        `[auth.resetPassword] error email=${cleanEmail} message=${
          err instanceof Error ? err.message : 'unknown'
        }`,
      );
      setPopup({
        title: 'No se pudo enviar',
        message: err instanceof Error ? err.message : 'No se pudo enviar la recuperacion.',
      });
    } finally {
      setLoading(false);
    }
  }

  function acceptPopup() {
    const next = popup?.next;
    setPopup(null);
    if (next === 'confirm') {
      navigation.navigate('ResetPasswordConfirm', { email: sentEmail });
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Recuperar clave</Text>
        <Text style={styles.subtitle}>Ingresa tu email para generar un codigo de recuperacion.</Text>
      </View>
      <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Button title="Enviar instrucciones" onPress={submit} disabled={!email || loading} loading={loading} />
      <LoadingOverlay visible={loading} message="Enviando codigo de recuperacion..." />
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
  },
});
