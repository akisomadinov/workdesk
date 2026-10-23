import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useUiStore } from "@/stores/useUiStore";
export default function useSwitchWorkspace() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { scope, setScope } = useWorkspaceStore();
    return useCallback(
        (next: string) => {
            if (next === scope) return;
            setScope(next);
            const ui = useUiStore.getState();
            ui.select(null);
            ui.setQuery("");
            ui.setSource("all");
            if (pathname.startsWith("/notes/")) navigate("/notes");
        },
        [scope, setScope, pathname, navigate]
    );
}
