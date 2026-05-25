import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
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
  const [processing, setProcessing] = useState(false);
  const [popup, setPopup] = useState<{ title: string; message: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('Comprobante no valido');

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<TransferReceipt[]>('/admin/transfers/pending')
      .then(setItems)
      .catch((err) =>
        setPopup({
          title: 'No se pudo cargar',
          message: err instanceof Error ? err.message : 'No se pudieron cargar transferencias.',
        }),
      )
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  async function approve(id: string) {
    setProcessing(true);
    try {
      await api.post(`/admin/transfers/${id}/approve`);
      setPopup({ title: 'Transferencia aprobada', message: 'La apuesta quedo activa.' });
      load();
    } catch (err) {
      setPopup({
        title: 'No se pudo aprobar',
        message: err instanceof Error ? err.message : 'No se pudo aprobar la transferencia.',
      });
    } finally {
      setProcessing(false);
    }
  }

  async function reject(id: string) {
    setProcessing(true);
    try {
      await api.post(`/admin/transfers/${id}/reject`, { reason: rejectReason });
      setPopup({ title: 'Transferencia rechazada', message: 'El pago fue marcado como rechazado.' });
      load();
    } catch (err) {
      setPopup({
        title: 'No se pudo rechazar',
        message: err instanceof Error ? err.message : 'No se pudo rechazar la transferencia.',
      });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Transferencias</Text>
        <Text style={styles.subtitle}>Comprobantes pendientes de revision.</Text>
      </View>
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
      <LoadingOverlay
        visible={loading || processing}
        message={processing ? 'Procesando transferencia...' : 'Cargando transferencias...'}
      />
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
  header: { gap: spacing.sm },
  title: { ...typography.title, color: colors.text },
  subtitle: { color: colors.textMuted },
  empty: { color: colors.textMuted },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  line: { color: colors.textMuted },
  amount: { color: colors.primary, fontSize: 18, fontWeight: '900' },
  actions: { gap: spacing.sm },
});
