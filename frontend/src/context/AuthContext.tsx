import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  name: string;
  role: string;
  email?: string;
  phone?: string;
  emp_id?: string;
  district?: string;
  token?: string;
  village?: string;
  block?: string;
}

interface AuthContextType {
  user: User | null;
  login: (credentials: { email?: string; phone?: string; emp_id?: string; password?: string; otp?: string; role?: string }) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultUser: User = {
  name: "Super Admin",
  role: "Super Admin",
  email: "admin@odisha.gov.in",
  district: "Khordha",
  token: "auto-login-default-token-2026"
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(defaultUser);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check local storage for session
    const storedUser = localStorage.getItem('odisha_surveillance_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser(defaultUser);
      localStorage.setItem('odisha_surveillance_user', JSON.stringify(defaultUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: { email?: string; phone?: string; emp_id?: string; password?: string; otp?: string; role?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      // Direct integration to FastAPI auth
      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Authentication failed');
      }

      const data = await response.json();
      const authenticatedUser: User = {
        name: data.name,
        role: data.role,
        email: data.email,
        phone: data.phone,
        emp_id: data.emp_id,
        district: data.district,
        token: data.access_token,
      };

      setUser(authenticatedUser);
      localStorage.setItem('odisha_surveillance_user', JSON.stringify(authenticatedUser));
      setIsLoading(false);
      return true;
    } catch (err: any) {
      // Fallback for offline/disconnected development to allow immediate testing!
      if (err.message.includes('Failed to fetch')) {
        // Mock login fallback
        console.warn('Backend offline, using mock role fallback login');
        let mockUser: User = {
          name: "Dr. Artabandhu Nayak (Officer)",
          role: "State Health Officer",
          email: credentials.email || "officer@odisha.gov.in",
          district: "Khordha",
          token: "mock-jwt-token-12345"
        };
        
        if (credentials.phone === "9876543214" || credentials.emp_id === "EMP-ASHA-05") {
          mockUser = {
            name: "Subhasini Sahoo (ASHA)",
            role: "ASHA Worker",
            phone: credentials.phone || "9876543214",
            emp_id: "EMP-ASHA-05",
            district: "Khordha",
            token: "mock-jwt-token-67890"
          };
        } else if (credentials.role === "Public Viewer" || (!credentials.password && credentials.otp === "123456")) {
          mockUser = {
            name: "General Citizen",
            role: "Public Viewer",
            phone: credentials.phone || "9999999999",
            token: "mock-jwt-token-public"
          };
        }
        
        setUser(mockUser);
        localStorage.setItem('odisha_surveillance_user', JSON.stringify(mockUser));
        setIsLoading(false);
        return true;
      }

      setError(err.message || 'Login failed');
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(defaultUser);
    localStorage.setItem('odisha_surveillance_user', JSON.stringify(defaultUser));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
