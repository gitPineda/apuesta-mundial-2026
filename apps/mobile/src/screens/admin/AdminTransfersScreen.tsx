import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { InfoCard } from '../../components/InfoCard';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { api } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface TransferReceipt {
  id: string;
  transfer_number: string;
  sender_bank: string;
  sender_name: string;
  amount: string;
  currency: string;
  email: string;
  created_at: string;
}

export function AdminTransfersScreen() {
  const [items, setItems] = useState<TransferReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectReason, setRejectReason] = useState('Comprobante no valido');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .get<TransferReceipt[]>('/admin/transfers/pending')
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar transferencias.'))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  async function approve(id: string) {
    await api.post(`/admin/transfers/${id}/approve`);
    load();
  }

  async function reject(id: string) {
    await api.post(`/admin/transfers/${id}/reject`, { reason: rejectReason });
    load();
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Transferencias</Text>
        <Text style={styles.subtitle}>Comprobantes pendientes de revision.</Text>
      </View>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && items.length === 0 ? <Text style={styles.empty}>No hay transferencias pendientes.</Text> : null}
      <TextField label="Motivo de rechazo" value={rejectReason} onChangeText={setRejectReason} />
      {items.map((item) => (
        <InfoCard key={item.id}>
          <Text style={styles.cardTitle}>{item.sender_name}</Text>
          <Text style={styles.line}>{item.email}</Text>
          <Text style={styles.line}>{item.sender_bank} - {item.transfer_number}</Text>
          <Text style={styles.amount}>${Number(item.amount).toFixed(2)} {item.currency}</Text>
          <View style={styles.actions}>
            <Button title="Aprobar" onPress={() => approve(item.id)} />
            <Button title="Rechazar" variant="danger" onPress={() => reject(item.id)} />
          </View>
        </InfoCard>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  title: { ...typography.title, color: colors.text },
  subtitle: { color: colors.textMuted },
  error: { color: colors.danger },
  empty: { color: colors.textMuted },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  line: { color: colors.textMuted },
  amount: { color: colors.primary, fontSize: 18, fontWeight: '900' },
  actions: { gap: spacing.sm },
});
