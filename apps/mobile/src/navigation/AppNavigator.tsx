import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CalendarDays, History, Home, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdminHomeScreen } from '../screens/admin/AdminHomeScreen';
import { AdminBankAccountsScreen } from '../screens/admin/AdminBankAccountsScreen';
import { AdminCreateMatchScreen } from '../screens/admin/AdminCreateMatchScreen';
import { AdminOddsScreen } from '../screens/admin/AdminOddsScreen';
import { AdminReportsScreen } from '../screens/admin/AdminReportsScreen';
import { AdminResultsScreen } from '../screens/admin/AdminResultsScreen';
import { AdminSettingsScreen } from '../screens/admin/AdminSettingsScreen';
import { AdminTransfersScreen } from '../screens/admin/AdminTransfersScreen';
import { CreateBetScreen } from '../screens/betting/CreateBetScreen';
import { PaymentScreen } from '../screens/betting/PaymentScreen';
import { BankTransferScreen } from '../screens/betting/BankTransferScreen';
import { CalendarScreen } from '../screens/main/CalendarScreen';
import { HistoryScreen } from '../screens/main/HistoryScreen';
import { HomeScreen } from '../screens/main/HomeScreen';
import { MatchDetailScreen } from '../screens/main/MatchDetailScreen';
import { MatchesByDateScreen } from '../screens/main/MatchesByDateScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { colors } from '../theme/colors';
import { AppStackParamList, MainTabsParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();
const Tabs = createBottomTabNavigator<MainTabsParamList>();

function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);

  return (
    <Tabs.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          borderTopColor: colors.border,
          height: 58 + bottomInset,
          paddingTop: 6,
          paddingBottom: bottomInset,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        tabBarItemStyle: { paddingVertical: 2 },
      }}
    >
      <Tabs.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="CalendarTab"
        component={CalendarScreen}
        options={{
          title: 'Calendario',
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{
          title: 'Historial',
          tabBarIcon: ({ color, size }) => <History color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.text },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="MatchesByDate" component={MatchesByDateScreen} options={{ title: 'Partidos' }} />
      <Stack.Screen name="MatchDetail" component={MatchDetailScreen} options={{ title: 'Detalle' }} />
      <Stack.Screen name="CreateBet" component={CreateBetScreen} options={{ title: 'Crear apuesta' }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Pago' }} />
      <Stack.Screen name="BankTransfer" component={BankTransferScreen} options={{ title: 'Transferencia' }} />
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} options={{ title: 'Admin' }} />
      <Stack.Screen name="AdminCreateMatch" component={AdminCreateMatchScreen} options={{ title: 'Nuevo partido' }} />
      <Stack.Screen name="AdminTransfers" component={AdminTransfersScreen} options={{ title: 'Transferencias' }} />
      <Stack.Screen name="AdminOdds" component={AdminOddsScreen} options={{ title: 'Cuotas' }} />
      <Stack.Screen name="AdminResults" component={AdminResultsScreen} options={{ title: 'Resultados' }} />
      <Stack.Screen name="AdminReports" component={AdminReportsScreen} options={{ title: 'Reportes' }} />
      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} options={{ title: 'Configuracion' }} />
      <Stack.Screen name="AdminBankAccounts" component={AdminBankAccountsScreen} options={{ title: 'Cuentas bancarias' }} />
    </Stack.Navigator>
  );
}
