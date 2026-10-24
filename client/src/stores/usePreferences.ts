import { create } from "zustand";
import { persist } from "zustand/middleware";
export type ThemeMode = "system" | "light" | "dark";
interface Preferences {
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
    sidebarCollapsed: boolean;
    toggleSidebar: () => void;
}
export const usePreferences = create<Preferences>()(
    persist(
        (set) => ({
            theme: "system",
            setTheme: (theme) => set({ theme }),
            sidebarCollapsed: false,
            toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
        }),
        { name: "workdesk-preferences" }
    )
);
