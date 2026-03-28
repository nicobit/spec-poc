import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "../authConfig";

interface AuthContextType {
  user: { name: string | undefined; username: string | undefined } | null;
  login: () => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return <AuthProviderInternal>{children}</AuthProviderInternal>;
}

function AuthProviderInternal({ children }: AuthProviderProps) {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [user, setUser] = useState<{ name: string | undefined; username: string | undefined } | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isAuthenticated && accounts.length > 0) {
      const account = accounts[0];
      setUser({
        name: account.name,
        username: account.username,
      });
    } else {
      setUser(null);
    }
    setIsReady(true);
  }, [isAuthenticated, accounts]);

  const login = async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = () => {
    instance.logoutPopup();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
