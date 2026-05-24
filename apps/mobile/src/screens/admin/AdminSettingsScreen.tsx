import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { InfoCard } from '../../components/InfoCard';
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
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    api
      .get<any[]>('/admin/fee-settings')
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar configuracion.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function create() {
    await api.post('/admin/fee-settings', {
      name,
      platformFeePercent: Number(platformFeePercent),
      operatorFeePercent: Number(operatorFeePercent),
      isActive: true,
    });
    load();
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Configuracion</Text>
        <Text style={styles.subtitle}>Comisiones aplicadas al pago ganador.</Text>
      </View>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <InfoCard>
        <TextField label="Nombre" value={name} onChangeText={setName} />
        <TextField label="Comision app %" value={platformFeePercent} onChangeText={setPlatformFeePercent} keyboardType="decimal-pad" />
        <TextField label="Comision operativa %" value={operatorFeePercent} onChangeText={setOperatorFeePercent} keyboardType="decimal-pad" />
        <Button title="Crear y activar" onPress={create} />
      </InfoCard>
      {items.map((item) => (
        <InfoCard key={item.id}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.line}>App: {item.platform_fee_percent}%</Text>
          <Text style={styles.line}>Operativa: {item.operator_fee_percent}%</Text>
          <Text style={item.is_active ? styles.active : styles.line}>{item.is_active ? 'Activa' : 'Inactiva'}</Text>
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
  cardTitle: { color: colors.text, fontWeight: '900', fontSize: 17 },
  line: { color: colors.textMuted },
  active: { color: colors.success, fontWeight: '900' },
});
