'use client';

interface AppUser {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  updateUser: (data: Partial<AppUser>) => Promise<void>;
}

export const AuthProvider = ({ children }: { children: any }) => {
  return children;
};

export const useAuth = (): AuthContextType => {
  return {
    user: null,
    loading: false,
    signIn: async () => {},
    signOut: async () => {},
    signUp: async () => {},
    updateUser: async () => {},
  };
};
