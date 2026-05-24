import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { InfoCard } from '../../components/InfoCard';
import { Screen } from '../../components/Screen';
import { api } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppScreenProps } from '../../navigation/types';

export function PaymentScreen({ navigation, route }: AppScreenProps<'Payment'>) {
  const { betId, amount } = route.params;

  async function initiatePayphone() {
    await api.post('/payments/payphone/initiate', {
      betId,
      idempotencyKey: `payphone-${betId}`,
    });
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Metodo de pago</Text>
        <Text style={styles.subtitle}>Apuesta creada por ${amount.toFixed(2)}. Debe pagarse para participar.</Text>
      </View>

      <InfoCard>
        <Text style={styles.cardTitle}>Transferencia bancaria</Text>
        <Text style={styles.text}>Ingresa el numero de transferencia y datos del depositante para revision admin.</Text>
        <Button title="Pagar por transferencia" onPress={() => navigation.navigate('BankTransfer', { betId })} />
      </InfoCard>

      <InfoCard>
        <Text style={styles.cardTitle}>PayPhone</Text>
        <Text style={styles.text}>Integracion reservada para fase 3. El backend ya guarda el intento de pago.</Text>
        <Button title="Crear intento PayPhone" variant="secondary" onPress={initiatePayphone} />
      </InfoCard>
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
    lineHeight: 20,
  },
  cardTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 17,
  },
  text: {
    color: colors.textMuted,
    lineHeight: 20,
  },
});
