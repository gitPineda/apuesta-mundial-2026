import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { clearSession, getStoredUser, saveSession, StoredUser } from '../services/tokenStorage';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  full_name?: string | null;
  birth_date?: string | null;
  phone?: string | null;
  is_adult_verified?: boolean;
  terms_accepted?: boolean;
  profile_completed?: boolean;
  roles?: string[];
}

interface AuthContextValue {
  user: StoredUser | null;
  session: StoredUser | null;
  profile: UserProfile | null;
  profileLoading: boolean;
  profileComplete: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmResetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
  signOut: () => Promise<void>;
}

interface LoginResponse {
  accessToken: string;
  user: StoredUser;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoredUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return null;
    }
    setProfileLoading(true);
    try {
      const nextProfile = await api.get<UserProfile>('/me');
      setProfile(nextProfile);
      return nextProfile;
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    void refreshProfile();
  }, [user, refreshProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session: user,
      profile,
      profileLoading,
      profileComplete: Boolean(profile?.profile_completed),
      loading,
      async signIn(email, password) {
        const response = await api.post<LoginResponse>('/auth/login', { email, password }, false);
        await saveSession(response.accessToken, response.user);
        setUser(response.user);
      },
      async signUp(email, password, username) {
        await api.post('/auth/register', { email, password, username }, false);
      },
      async resetPassword(email) {
        await api.post('/auth/forgot-password', { email }, false);
      },
      async confirmResetPassword(email, code, newPassword) {
        await api.post('/auth/reset-password', { email, code, newPassword }, false);
      },
      refreshProfile,
      async signOut() {
        await clearSession();
        setUser(null);
        setProfile(null);
      },
    }),
    [user, profile, profileLoading, loading, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
