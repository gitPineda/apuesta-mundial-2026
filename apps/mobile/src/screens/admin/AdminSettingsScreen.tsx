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

export function AdminSettingsScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState('Comisiones operativas');
  const [platformFeePercent, setPlatformFeePercent] = useState('4');
  const [operatorFeePercent, setOperatorFeePercent] = useState('6');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [popup, setPopup] = useState<{ title: string; message: string } | null>(null);

  function load() {
    setLoading(true);
    api
      .get<any[]>('/admin/fee-settings')
      .then(setItems)
      .catch((err) =>
        setPopup({
          title: 'No se pudo cargar',
          message: err instanceof Error ? err.message : 'No se pudo cargar configuracion.',
        }),
      )
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function create() {
    const platformFee = Number(platformFeePercent.replace(',', '.'));
    const operatorFee = Number(operatorFeePercent.replace(',', '.'));
    if (!name.trim() || !Number.isFinite(platformFee) || !Number.isFinite(operatorFee)) {
      setPopup({ title: 'Datos invalidos', message: 'Ingresa nombre y porcentajes validos.' });
      return;
    }

    setSaving(true);
    try {
      await api.post('/admin/fee-settings', {
        name,
        platformFeePercent: platformFee,
        operatorFeePercent: operatorFee,
        isActive: true,
      });
      setPopup({ title: 'Configuracion guardada', message: 'Las comisiones quedaron activas.' });
      load();
    } catch (err) {
      setPopup({
        title: 'No se pudo guardar',
        message: err instanceof Error ? err.message : 'No se pudo guardar configuracion.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Configuracion</Text>
        <Text style={styles.subtitle}>Comisiones aplicadas al pago ganador.</Text>
      </View>
      <InfoCard>
        <TextField label="Nombre" value={name} onChangeText={setName} />
        <TextField label="Comision app %" value={platformFeePercent} onChangeText={setPlatformFeePercent} keyboardType="decimal-pad" />
        <TextField label="Comision operativa %" value={operatorFeePercent} onChangeText={setOperatorFeePercent} keyboardType="decimal-pad" />
        <Button title="Crear y activar" onPress={create} loading={saving} />
      </InfoCard>
      {items.map((item) => (
        <InfoCard key={item.id}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.line}>App: {item.platform_fee_percent}%</Text>
          <Text style={styles.line}>Operativa: {item.operator_fee_percent}%</Text>
          <Text style={item.is_active ? styles.active : styles.line}>{item.is_active ? 'Activa' : 'Inactiva'}</Text>
        </InfoCard>
      ))}
      <LoadingOverlay
        visible={loading || saving}
        message={saving ? 'Guardando configuracion...' : 'Cargando configuracion...'}
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
  cardTitle: { color: colors.text, fontWeight: '900', fontSize: 17 },
  line: { color: colors.textMuted },
  active: { color: colors.success, fontWeight: '900' },
});
