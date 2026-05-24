import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { InfoCard } from '../../components/InfoCard';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { api } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface BankAccount {
  id: string;
  bank_name: string;
  account_holder: string;
  account_number: string;
  account_type: string;
  document_number?: string;
  instructions?: string;
  is_active: boolean;
}

export function AdminBankAccountsScreen() {
  const [items, setItems] = useState<BankAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('corriente');
  const [documentNumber, setDocumentNumber] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isActiveText, setIsActiveText] = useState('true');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    setError('');
    api
      .get<BankAccount[]>('/admin/bank-accounts')
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar cuentas.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function select(item: BankAccount) {
    setSelectedId(item.id);
    setBankName(item.bank_name);
    setAccountHolder(item.account_holder);
    setAccountNumber(item.account_number);
    setAccountType(item.account_type);
    setDocumentNumber(item.document_number ?? '');
    setInstructions(item.instructions ?? '');
    setIsActiveText(String(item.is_active));
  }

  function clearForm() {
    setSelectedId(null);
    setBankName('');
    setAccountHolder('');
    setAccountNumber('');
    setAccountType('corriente');
    setDocumentNumber('');
    setInstructions('');
    setIsActiveText('true');
  }

  async function save() {
    setMessage('');
    setError('');
    const body = {
      bankName,
      accountHolder,
      accountNumber,
      accountType,
      documentNumber,
      instructions,
      isActive: isActiveText.toLowerCase() === 'true',
    };
    try {
      if (selectedId) {
        await api.post(`/admin/bank-accounts/${selectedId}`, body);
      } else {
        await api.post('/admin/bank-accounts', body);
      }
      setMessage('Cuenta guardada.');
      clearForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la cuenta.');
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Cuentas bancarias</Text>
        <Text style={styles.subtitle}>Datos que vera el usuario para transferir el valor de la apuesta.</Text>
      </View>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}

      <InfoCard>
        <Text style={styles.cardTitle}>{selectedId ? 'Editar cuenta' : 'Nueva cuenta'}</Text>
        <TextField label="Banco" value={bankName} onChangeText={setBankName} />
        <TextField label="Titular" value={accountHolder} onChangeText={setAccountHolder} />
        <TextField label="Numero de cuenta" value={accountNumber} onChangeText={setAccountNumber} />
        <TextField label="Tipo de cuenta" value={accountType} onChangeText={setAccountType} />
        <TextField label="Documento/RUC" value={documentNumber} onChangeText={setDocumentNumber} />
        <TextField label="Instrucciones" value={instructions} onChangeText={setInstructions} multiline />
        <TextField label="Activa true/false" value={isActiveText} onChangeText={setIsActiveText} autoCapitalize="none" />
        <Button title="Guardar cuenta" onPress={save} disabled={!bankName || !accountHolder || !accountNumber || !accountType} />
        {selectedId ? <Button title="Nueva cuenta" variant="secondary" onPress={clearForm} /> : null}
      </InfoCard>

      {items.map((item) => (
        <Pressable key={item.id} onPress={() => select(item)}>
          <InfoCard>
            <Text style={styles.cardTitle}>{item.bank_name}</Text>
            <Text style={styles.line}>{item.account_holder}</Text>
            <Text style={styles.line}>{item.account_type} - {item.account_number}</Text>
            <Text style={item.is_active ? styles.active : styles.inactive}>{item.is_active ? 'Activa' : 'Inactiva'}</Text>
          </InfoCard>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  title: { ...typography.title, color: colors.text },
  subtitle: { color: colors.textMuted, lineHeight: 20 },
  error: { color: colors.danger },
  success: { color: colors.success, fontWeight: '900' },
  cardTitle: { color: colors.text, fontWeight: '900', fontSize: 17 },
  line: { color: colors.textMuted },
  active: { color: colors.success, fontWeight: '900' },
  inactive: { color: colors.danger, fontWeight: '900' },
});
