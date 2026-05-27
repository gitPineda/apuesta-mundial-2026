import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppPopup } from '../../components/AppPopup';
import { Button } from '../../components/Button';
import { InfoCard } from '../../components/InfoCard';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { api } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppScreenProps } from '../../navigation/types';

interface BankAccount {
  id: string;
  bank_name: string;
  account_holder: string;
  account_number: string;
  account_type: string;
  document_number?: string;
  instructions?: string;
}

export function BankTransferScreen({ navigation, route }: AppScreenProps<'BankTransfer'>) {
  const { betId } = route.params;
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [transferNumber, setTransferNumber] = useState('');
  const [senderBank, setSenderBank] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderDocument, setSenderDocument] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [popup, setPopup] = useState<{ title: string; message: string; onAccept?: () => void } | null>(null);

  useEffect(() => {
    api
      .get<BankAccount[]>('/payments/bank-accounts')
      .then((accounts) => setBankAccount(accounts[0] ?? null))
      .catch(() => {
        setBankAccount(null);
        setPopup({
          title: 'Cuenta no disponible',
          message: 'No se pudieron cargar las cuentas bancarias activas.',
        });
      })
      .finally(() => setLoadingAccounts(false));
  }, []);

  async function submit() {
    setSubmitting(true);
    try {
      await api.post('/payments/bank-transfer', {
        betId,
        bankAccountId: bankAccount?.id,
        transferNumber,
        senderBank,
        senderName,
        senderDocument,
        transferDate,
      });
      setPopup({
        title: 'Transferencia enviada',
        message: 'Comprobante enviado. La apuesta queda pendiente de revision.',
        onAccept: () => navigation.navigate('MainTabs', { screen: 'HistoryTab' }),
      });
    } catch (err) {
      setPopup({
        title: 'No se pudo enviar',
        message: err instanceof Error ? err.message : 'No se pudo registrar la transferencia.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Transferencia</Text>
        <Text style={styles.subtitle}>Para el MVP falta cargar cuentas bancarias reales desde admin. Este formulario ya respeta los campos requeridos.</Text>
      </View>

      <InfoCard>
        <Text style={styles.cardTitle}>Cuenta bancaria</Text>
        {bankAccount ? (
          <>
            <Text style={styles.bankLine}>{bankAccount.bank_name}</Text>
            <Text style={styles.bankLine}>{bankAccount.account_holder}</Text>
            <Text style={styles.bankLine}>{bankAccount.account_type} - {bankAccount.account_number}</Text>
            {bankAccount.instructions ? <Text style={styles.bankHint}>{bankAccount.instructions}</Text> : null}
          </>
        ) : (
          <Text style={styles.bankHint}>No hay cuenta bancaria activa configurada.</Text>
        )}
      </InfoCard>

      <InfoCard>
        <Text style={styles.cardTitle}>Datos requeridos</Text>
        <TextField label="Numero de transferencia" value={transferNumber} onChangeText={setTransferNumber} />
        <TextField label="Banco origen" value={senderBank} onChangeText={setSenderBank} />
        <TextField label="Nombre del depositante" value={senderName} onChangeText={setSenderName} />
        <TextField label="Identificación del depositante" value={senderDocument} onChangeText={setSenderDocument} />
        <TextField label="Fecha de transferencia" value={transferDate} onChangeText={setTransferDate} />
        <Button
          title="Enviar a revision"
          onPress={submit}
          loading={submitting}
          disabled={!bankAccount || !transferNumber || !senderBank || !senderName || !transferDate}
        />
      </InfoCard>
      <LoadingOverlay
        visible={loadingAccounts || submitting}
        message={submitting ? 'Enviando transferencia...' : 'Cargando cuenta bancaria...'}
      />
      <AppPopup
        visible={Boolean(popup)}
        title={popup?.title ?? ''}
        message={popup?.message ?? ''}
        onAccept={() => {
          const action = popup?.onAccept;
          setPopup(null);
          action?.();
        }}
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
    color: colors.textMuted,
    lineHeight: 20,
  },
  cardTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 17,
  },
  bankLine: {
    color: colors.text,
    fontWeight: '700',
  },
  bankHint: {
    color: colors.textMuted,
    lineHeight: 20,
  },
});
