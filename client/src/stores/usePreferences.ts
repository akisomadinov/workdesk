import { create } from "zustand";
import { persist } from "zustand/middleware";
export type ThemeMode = "system" | "light" | "dark";
export const usePreferences = create<{ theme: ThemeMode; setTheme: (theme: ThemeMode) => void }>()(
    persist((set) => ({ theme: "system", setTheme: (theme) => set({ theme }) }), { name: "workdesk-preferences" })
);
