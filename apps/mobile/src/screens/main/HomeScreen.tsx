import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CalendarDays, ChartNoAxesCombined, Landmark, ShieldCheck, SlidersHorizontal, Trophy, WalletCards } from 'lucide-react-native';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { InfoCard } from '../../components/InfoCard';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/Screen';
import { AppStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { user } = useAuth();
  const isAdminUser = Boolean(user?.roles?.some((role) => role === 'admin' || role === 'operator'));

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>MVP demo</Text>
        <Text style={styles.title}>ASERBIESS Mundial 2026</Text>
        <Text style={styles.subtitle}>Calendario, pronosticos y pagos auditables para operar primero en modo demo.</Text>
      </View>

      <View style={styles.grid}>
        <HomeActionCard
          icon={<CalendarDays color={colors.primary} size={24} />}
          title="Calendario"
          text="Ver partidos por fecha y estado de cierre."
          onPress={() => navigation.navigate('MainTabs', { screen: 'CalendarTab' })}
        />
        {isAdminUser ? (
          <>
            <HomeActionCard
              icon={<WalletCards color={colors.accent} size={24} />}
              title="Transferencias"
              text="Aprobar o rechazar comprobantes pendientes."
              onPress={() => navigation.navigate('AdminTransfers')}
            />
            <HomeActionCard
              icon={<SlidersHorizontal color={colors.primary} size={24} />}
              title="Cuotas"
              text="Configurar multiplicadores por mercado."
              onPress={() => navigation.navigate('AdminOdds')}
            />
            <HomeActionCard
              icon={<CalendarDays color={colors.primary} size={24} />}
              title="Nuevo partido"
              text="Crear juegos especiales y resultado simple."
              onPress={() => navigation.navigate('AdminCreateMatch')}
            />
            <HomeActionCard
              icon={<Trophy color={colors.success} size={24} />}
              title="Resultados"
              text="Registrar marcadores y liquidar apuestas."
              onPress={() => navigation.navigate('AdminResults')}
            />
            <HomeActionCard
              icon={<ChartNoAxesCombined color={colors.accent} size={24} />}
              title="Reportes"
              text="Ver resumen financiero y operativo."
              onPress={() => navigation.navigate('AdminReports')}
            />
            <HomeActionCard
              icon={<Landmark color={colors.warning} size={24} />}
              title="Cuentas"
              text="Administrar cuentas bancarias."
              onPress={() => navigation.navigate('AdminBankAccounts')}
            />
          </>
        ) : (
          <>
            <HomeActionCard
              icon={<WalletCards color={colors.accent} size={24} />}
              title="Pagos"
              text="Revisa el estado de tus apuestas y pagos."
              onPress={() => navigation.navigate('MainTabs', { screen: 'HistoryTab' })}
            />
            <HomeActionCard
              icon={<ShieldCheck color={colors.success} size={24} />}
              title="Control"
              text="Revisa y actualiza tus datos de perfil."
              onPress={() => navigation.navigate('MainTabs', { screen: 'ProfileTab' })}
            />
          </>
        )}
      </View>

      {isAdminUser ? (
        <InfoCard>
          <Text style={styles.adminTitle}>Panel administrativo</Text>
          <Text style={styles.cardText}>Acceso disponible para rol {user?.roles.includes('admin') ? 'admin' : 'operator'}.</Text>
          <Button title="Entrar al panel admin" variant="secondary" onPress={() => navigation.navigate('AdminHome')} />
        </InfoCard>
      ) : null}

      <Button title="Ver calendario" onPress={() => navigation.navigate('MainTabs', { screen: 'CalendarTab' })} />
    </Screen>
  );
}

function HomeActionCard({
  icon,
  title,
  text,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.actionCard, pressed && styles.actionPressed]} onPress={onPress}>
      {icon}
      <View style={styles.actionText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardText}>{text}</Text>
      </View>
      <Text style={styles.go}>Abrir</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 0,
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
  grid: {
    gap: spacing.md,
  },
  actionCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 82,
  },
  actionPressed: {
    opacity: 0.75,
  },
  actionText: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  cardText: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  adminTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  go: {
    color: colors.primary,
    fontWeight: '900',
  },
});
