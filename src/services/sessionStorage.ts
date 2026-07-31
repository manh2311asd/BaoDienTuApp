import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { UserSession } from '../store/useAppStore';

const PROFILE_KEY = '@BaoDienTu:session_profile';
const TOKEN_KEY = 'BaoDienTu.session_token';
const LEGACY_SESSION_KEY = '@BaoDienTu:user_session';
const LEGACY_TIMESTAMP_KEY = '@BaoDienTu:user_session_timestamp';
const avatarKey = (userId: number) => `@BaoDienTu:user_avatar:${userId}`;

type StoredProfile = Omit<UserSession, 'jwtToken'>;

export const saveStoredSession = async (user: UserSession): Promise<void> => {
  const { jwtToken, ...profile } = user;
  const writes: Promise<void>[] = [
    AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile)),
    SecureStore.setItemAsync(TOKEN_KEY, jwtToken),
  ];
  if (profile.avatar) {
    writes.push(AsyncStorage.setItem(avatarKey(profile.id), profile.avatar));
  }
  await Promise.all(writes);
};

const migrateLegacySession = async (): Promise<UserSession | null> => {
  const legacy = await AsyncStorage.getItem(LEGACY_SESSION_KEY);
  if (!legacy) {
    return null;
  }

  try {
    const user = JSON.parse(legacy) as UserSession;
    if (!user.jwtToken) {
      return null;
    }
    await saveStoredSession(user);
    return user;
  } finally {
    await AsyncStorage.multiRemove([LEGACY_SESSION_KEY, LEGACY_TIMESTAMP_KEY]);
  }
};

export const loadStoredSession = async (): Promise<UserSession | null> => {
  const [profileJson, jwtToken] = await Promise.all([
    AsyncStorage.getItem(PROFILE_KEY),
    SecureStore.getItemAsync(TOKEN_KEY),
  ]);

  if (!profileJson || !jwtToken) {
    return migrateLegacySession();
  }

  try {
    const profile = JSON.parse(profileJson) as StoredProfile;
    const cachedAvatar = await AsyncStorage.getItem(avatarKey(profile.id));
    return {
      ...profile,
      avatar: profile.avatar || cachedAvatar || undefined,
      jwtToken,
    };
  } catch {
    await clearStoredSession();
    return null;
  }
};

export const clearStoredSession = async (): Promise<void> => {
  await Promise.all([
    AsyncStorage.removeItem(PROFILE_KEY),
    AsyncStorage.multiRemove([LEGACY_SESSION_KEY, LEGACY_TIMESTAMP_KEY]),
    SecureStore.deleteItemAsync(TOKEN_KEY),
  ]);
};
