import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { LoadingScreen } from './src/screens/main/LoadingScreen';
import { ProfileScreen } from './src/screens/profile/ProfileScreen';

function Root() {
  const { session, loading, profileComplete, profileLoading } = useAuth();

  if (loading || (session && profileLoading)) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {session ? (profileComplete ? <AppNavigator /> : <ProfileScreen />) : <AuthNavigator />}
      <StatusBar style="dark" />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
