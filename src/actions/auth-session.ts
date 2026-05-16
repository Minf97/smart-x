import { LOCAL_STORAGE_KEYS } from "@/constants";

export const DEMO_AUTH_EMAIL = "demo@smart-x.local";
export const DEMO_AUTH_PASSWORD = "smartx";

interface AuthSession {
  email: string;
  signedInAt: string;
}

// 读取会话
export function getAuthSession(): AuthSession | null {
  const value = localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_SESSION);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthSession;
  } catch {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_SESSION);
    return null;
  }
}

// 登录状态
export function isSignedIn() {
  return Boolean(getAuthSession());
}

// 写入会话
export function signInWithPassword(email: string, password: string) {
  const nextEmail = email.trim().toLowerCase();

  if (nextEmail !== DEMO_AUTH_EMAIL || password !== DEMO_AUTH_PASSWORD) {
    return false;
  }

  localStorage.setItem(
    LOCAL_STORAGE_KEYS.AUTH_SESSION,
    JSON.stringify({
      email: nextEmail,
      signedInAt: new Date().toISOString(),
    } satisfies AuthSession)
  );

  return true;
}

// 清理会话
export function signOut() {
  localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_SESSION);
}

// 重置流程
export function resetAuthSession() {
  localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_SESSION);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.ONBOARDING_COMPLETE);
}

// 教程状态
export function isOnboardingComplete() {
  return localStorage.getItem(LOCAL_STORAGE_KEYS.ONBOARDING_COMPLETE) === "1";
}

// 完成教程
export function completeOnboarding() {
  localStorage.setItem(LOCAL_STORAGE_KEYS.ONBOARDING_COMPLETE, "1");
}
