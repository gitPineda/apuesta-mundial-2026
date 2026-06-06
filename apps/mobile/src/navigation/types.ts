import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ResetPassword: undefined;
  ResetPasswordConfirm: { email: string };
};

export type MainTabsParamList = {
  HomeTab: undefined;
  CalendarTab: undefined;
  HistoryTab: undefined;
  ProfileTab: undefined;
};

export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabsParamList>;
  MatchesByDate: { date: string };
  MatchDetail: { matchId: string };
  CreateBet: { matchId: string; oddsId: string; selectionLabel: string };
  Payment: { betId: string; amount: number };
  BankTransfer: { betId: string };
  AdminHome: undefined;
  AdminCreateMatch: undefined;
  AdminTransfers: undefined;
  AdminOdds: undefined;
  AdminResults: undefined;
  AdminReports: undefined;
  AdminSettings: undefined;
  AdminSessions: undefined;
  AdminBankAccounts: undefined;
};

export type AppScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<
  AppStackParamList,
  T
>;
