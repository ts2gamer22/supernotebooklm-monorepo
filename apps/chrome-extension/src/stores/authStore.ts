import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  isInitialized: boolean;
  setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isInitialized: false,
      setInitialized: (initialized) => set({ isInitialized: initialized }),
    }),
    {
      name: "auth-storage",
    }
  )
);
