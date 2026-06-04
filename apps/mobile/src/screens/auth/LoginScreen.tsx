import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppPopup } from '../../components/AppPopup';
import { Button } from '../../components/Button';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { PasswordField } from '../../components/PasswordField';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{ title: string; message: string } | null>(null);

  async function submit() {
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setPopup({
        title: 'No se pudo ingresar',
        message: err instanceof Error ? err.message : 'No se pudo iniciar sesion.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>ASERBIESS Mundial 2026</Text>
        <Text style={styles.subtitle}>Predicciones claras, estados auditables y pagos controlados.</Text>
      </View>

      <View style={styles.form}>
        <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <PasswordField label="Clave" value={password} onChangeText={setPassword} />
        <Button title="Ingresar" onPress={submit} loading={loading} disabled={!email || !password} />
      </View>

      <View style={styles.links}>
        <Pressable onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Crear cuenta</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('ResetPassword')}>
          <Text style={styles.linkMuted}>Recuperar clave</Text>
        </Pressable>
      </View>
      <LoadingOverlay visible={loading} message="Iniciando sesion..." />
      <AppPopup
        visible={Boolean(popup)}
        title={popup?.title ?? ''}
        message={popup?.message ?? ''}
        onAccept={() => setPopup(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: spacing.xl,
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
  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
  },
  linkMuted: {
    color: colors.textMuted,
    fontWeight: '700',
  },
});
