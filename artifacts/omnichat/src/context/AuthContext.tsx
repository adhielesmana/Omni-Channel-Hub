import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface AuthUser {
  name: string;
  email: string;
  role: "admin" | "supervisor" | "agent";
  initials: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const DEMO_USERS: Record<string, AuthUser & { password: string }> = {
  "admin@omnichat.io": {
    name: "Alex Rivera",
    email: "admin@omnichat.io",
    role: "admin",
    initials: "AR",
    password: "demo",
  },
  "supervisor@omnichat.io": {
    name: "Morgan Chen",
    email: "supervisor@omnichat.io",
    role: "supervisor",
    initials: "MC",
    password: "demo",
  },
  "sarah.k@omnichat.io": {
    name: "Sarah Kim",
    email: "sarah.k@omnichat.io",
    role: "agent",
    initials: "SK",
    password: "demo",
  },
};

const SESSION_KEY = "omnichat_session";

function loadSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadSession);

  const login = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      await new Promise((r) => setTimeout(r, 600));
      const match = DEMO_USERS[email.toLowerCase().trim()];
      if (!match || match.password !== password) {
        return { ok: false, error: "Invalid email or password." };
      }
      const { password: _p, ...sessionUser } = match;
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      setUser(sessionUser);
      return { ok: true };
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
