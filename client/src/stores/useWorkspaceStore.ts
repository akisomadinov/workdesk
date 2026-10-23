import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
interface WorkspaceState {
    scope: string;
    userId: string | null;
    setScope: (scope: string) => void;
    bindUser: (userId: string) => void;
}
export const useWorkspaceStore = create<WorkspaceState>()(
    persist(
        (set) => ({
            scope: "mine",
            userId: null,
            setScope: (scope) => set({ scope }),
            bindUser: (userId) => set((state) => (state.userId === userId ? state : { userId, scope: "mine" }))
        }),
        { name: "workdesk-workspace", storage: createJSONStorage(() => sessionStorage) }
    )
);
