import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { InfoCard } from '../../components/InfoCard';
import { Screen } from '../../components/Screen';
import { api } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppStackParamList } from '../../navigation/types';

const sections: Array<{ title: string; description: string; route: keyof AppStackParamList }> = [
  { title: 'Transferencias', description: 'Aprobar o rechazar comprobantes pendientes.', route: 'AdminTransfers' },
  { title: 'Cuotas', description: 'Consultar mercados y editar multiplicadores.', route: 'AdminOdds' },
  { title: 'Resultados', description: 'Registrar marcador oficial por partido.', route: 'AdminResults' },
  { title: 'Reportes', description: 'Resumen financiero y operativo.', route: 'AdminReports' },
  { title: 'Configuracion', description: 'Comisiones de app y operacion.', route: 'AdminSettings' },
  { title: 'Cuentas bancarias', description: 'Datos donde se reciben transferencias.', route: 'AdminBankAccounts' },
];

export function AdminHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [dashboard, setDashboard] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/admin/dashboard')
      .then(setDashboard)
      .catch((err) => setError(err instanceof Error ? err.message : 'No tienes acceso admin.'));
  }, []);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Admin basico</Text>
        <Text style={styles.subtitle}>Resumen operativo del MVP.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <InfoCard>
        <Text style={styles.cardTitle}>Dashboard</Text>
        <View style={styles.row}><Text style={styles.label}>Usuarios</Text><Text style={styles.value}>{dashboard?.users ?? '-'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Apuestas</Text><Text style={styles.value}>{dashboard?.bets ?? '-'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Total apostado</Text><Text style={styles.value}>${Number(dashboard?.total_staked ?? 0).toFixed(2)}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Transferencias pendientes</Text><Text style={styles.value}>{dashboard?.pending_transfers ?? '-'}</Text></View>
      </InfoCard>

      <View style={styles.list}>
        {sections.map((section) => (
          <Pressable
            key={section.route}
            style={styles.sectionRow}
            onPress={() => navigation.navigate(section.route as never)}
          >
            <View style={styles.sectionText}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionDescription}>{section.description}</Text>
            </View>
            <Text style={styles.go}>Abrir</Text>
          </Pressable>
        ))}
      </View>
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
  },
  cardTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 17,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  label: {
    color: colors.textMuted,
  },
  value: {
    color: colors.text,
    fontWeight: '900',
  },
  error: {
    color: colors.danger,
  },
  list: {
    gap: spacing.md,
  },
  sectionRow: {
    minHeight: 72,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionText: {
    flex: 1,
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 16,
  },
  sectionDescription: {
    color: colors.textMuted,
    lineHeight: 19,
  },
  go: {
    color: colors.primary,
    fontWeight: '900',
  },
});
