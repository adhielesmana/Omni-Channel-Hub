import { createContext, useContext, useState, useCallback, useLayoutEffect, type ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "supervisor" | "agent";
  initials: string;
  avatarUrl: string | null;
  departmentId: number | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  updateUser: (updates: Partial<AuthUser>) => void;
}

const SESSION_KEY = "omnichat_session";
const TOKEN_KEY = "omnichat_token";

function loadSession(): { user: AuthUser | null; token: string | null } {
  try {
    const userRaw = localStorage.getItem(SESSION_KEY);
    const tokenRaw = localStorage.getItem(TOKEN_KEY);
    return {
      user: userRaw ? JSON.parse(userRaw) as AuthUser : null,
      token: tokenRaw,
    };
  } catch {
    return { user: null, token: null };
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadSession().user);
  const [token, setToken] = useState<string | null>(() => loadSession().token);

  useLayoutEffect(() => {
    if (token) {
      setAuthTokenGetter(() => token);
    } else {
      setAuthTokenGetter(null);
    }
  }, [token]);

  const login = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { ok: false, error: data.error ?? "Invalid email or password." };
        }
        const authUser: AuthUser = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          avatarUrl: data.user.avatarUrl ?? null,
          departmentId: data.user.departmentId ?? null,
          initials: data.user.name
            ?.split(" ")
            .map((s: string) => s[0])
            .join("")
            .substring(0, 2)
            .toUpperCase() ?? "??",
        };
        setAuthTokenGetter(() => data.token);
        localStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
        localStorage.setItem(TOKEN_KEY, data.token);
        setUser(authUser);
        setToken(data.token);
        return { ok: true };
      } catch {
        return { ok: false, error: "Unable to connect to server." };
      }
    },
    []
  );

  const logout = useCallback(() => {
    setAuthTokenGetter(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setToken(null);
  }, []);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
