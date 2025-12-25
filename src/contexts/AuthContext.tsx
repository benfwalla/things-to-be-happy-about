import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const loginMutation = useMutation(api.auth.login);
  const logoutMutation = useMutation(api.auth.logout);
  const checkAuthQuery = useQuery(api.auth.checkAuth, {
    token: localStorage.getItem("admin_token") || undefined,
  });

  useEffect(() => {
    if (checkAuthQuery !== undefined) {
      setIsAuthenticated(checkAuthQuery.authenticated);
      
      // Clear expired tokens
      if (!checkAuthQuery.authenticated && localStorage.getItem("admin_token")) {
        localStorage.removeItem("admin_token");
      }
      
      setIsLoading(false);
    }
  }, [checkAuthQuery]);

  const login = async (password: string): Promise<boolean> => {
    try {
      const result = await loginMutation({ password });
      if (result) {
        localStorage.setItem("admin_token", result.token);
        setIsAuthenticated(true);
        return true;
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
    return false;
  };

  const logout = async () => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      try {
        await logoutMutation({ token });
      } catch (error) {
        console.error("Logout error:", error);
      }
      localStorage.removeItem("admin_token");
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
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
