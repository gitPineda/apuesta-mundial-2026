import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'apuesta_mundial_access_token';
const USER_KEY = 'apuesta_mundial_user';

export interface StoredUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
}

export async function saveSession(accessToken: string, user: StoredUser) {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, accessToken],
    [USER_KEY, JSON.stringify(user)],
  ]);
}

export async function getAccessToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getStoredUser() {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as StoredUser) : null;
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}
