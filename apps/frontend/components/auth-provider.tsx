"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import * as api from "@/lib/api";

interface AuthState {
  user: api.AuthUser | null;
  token: string | null;
  ready: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (input: Parameters<typeof api.register>[0]) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "survey.auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    ready: false,
  });

  // Hydrate from localStorage on first mount (client-only)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { user: api.AuthUser; token: string };
        setState({ user: parsed.user, token: parsed.token, ready: true });
        return;
      }
    } catch {
      // ignore corrupt storage
    }
    setState((s) => ({ ...s, ready: true }));
  }, []);

  const persist = useCallback((user: api.AuthUser, token: string) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
    setState({ user, token, ready: true });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { user, tokens } = await api.login(email, password);
      persist(user, tokens.access);
      router.push("/surveys");
    },
    [persist, router],
  );

  const register = useCallback(
    async (input: Parameters<typeof api.register>[0]) => {
      const { user, tokens } = await api.register(input);
      persist(user, tokens.access);
      router.push("/surveys");
    },
    [persist, router],
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState({ user: null, token: null, ready: true });
    router.push("/login");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout }),
    [state, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/**
 * Helper for pages that require a logged-in user. Redirects to /login
 * while still hydrating; returns null until ready.
 */
export function useRequireAuth(): { user: api.AuthUser; token: string } | null {
  const { user, token, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !token) router.replace("/login");
  }, [ready, token, router]);

  if (!ready || !token || !user) return null;
  return { user, token };
}
