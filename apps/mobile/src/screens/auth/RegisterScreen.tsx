import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { ErrorText } from '../../components/ErrorText';
import { PasswordField } from '../../components/PasswordField';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { onlyLetters } from '../../utils/inputMasks';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError('');
    setLoading(true);
    try {
      await signUp(email.trim(), password, username.trim());
      setSuccessVisible(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.');
    } finally {
      setLoading(false);
    }
  }

  function acceptSuccess() {
    setSuccessVisible(false);
    setUsername('');
    setEmail('');
    setPassword('');
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.subtitle}>Completa tus datos. El perfil y la mayoria de edad se validan antes de apostar.</Text>
      </View>
      <View style={styles.form}>
        <TextField label="Usuario" value={username} onChangeText={(value) => setUsername(onlyLetters(value, 80))} autoCapitalize="none" />
        <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <PasswordField label="Clave" value={password} onChangeText={setPassword} />
        <ErrorText message={error} />
        <Button title="Registrarme" onPress={submit} loading={loading} disabled={!username || !email || password.length < 6} />
        <Button title="Volver al login" variant="secondary" onPress={() => navigation.goBack()} />
      </View>
      <Modal transparent visible={successVisible} animationType="fade" onRequestClose={acceptSuccess}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cuenta creada</Text>
            <Text style={styles.modalText}>Tu cuenta fue registrada correctamente. Ahora puedes iniciar sesion.</Text>
            <Button title="Aceptar" onPress={acceptSuccess} />
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '900',
  },
  modalText: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
});
