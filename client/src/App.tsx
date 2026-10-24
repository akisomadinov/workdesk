import { useEffect } from "react";
import { Alert, Box } from "@mui/material";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthSessionQuery } from "@/api/autogen/workdesk";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import AccountPage from "@/pages/AccountPage";
import WorkspaceLayout from "@/common/layout/WorkspaceLayout";
import { accountPath, safeReturnTo } from "@/pages/account/navigation";
import { api } from "@/api/api";
import { store } from "@/app/store";

export default function App() {
    const location = useLocation();
    const {
        data: session,
        isLoading,
        error
    } = useAuthSessionQuery(undefined, { pollingInterval: 60000, refetchOnFocus: true });
    const { userId, bindUser } = useWorkspaceStore();
    useEffect(() => {
        if (session?.userId && session.userId !== userId) {
            bindUser(session.userId);
            if (userId) store.dispatch(api.util.resetApiState());
        }
    }, [session?.userId, userId, bindUser]);
    if (isLoading) return <Box sx={{ p: 5 }}>Открываем Workdesk…</Box>;
    if (error)
        return (
            <Box sx={{ p: 4 }}>
                <Alert severity="error">Не удалось связаться с приложением. Проверь, что оно запущено.</Alert>
            </Box>
        );
    if (!session) return null;
    const path = location.pathname.replace(/\/$/, "") || "/";
    const returnTo = location.pathname + location.search + location.hash;
    if (session.setupRequired && !session.sharedMode && path !== "/register")
        return (
            <Navigate
                to={accountPath(
                    "register",
                    path === "/login" ? safeReturnTo(new URLSearchParams(location.search).get("returnTo")) : returnTo
                )}
                replace
            />
        );
    if (path === "/login" || path === "/register") {
        if (session.authenticated)
            return <Navigate to={safeReturnTo(new URLSearchParams(location.search).get("returnTo"))} replace />;
        return <AccountPage key={path} mode={path === "/login" ? "login" : "register"} session={session} />;
    }
    if (path === "/join") return <AccountPage mode="join" session={session} />;
    if (!session.authenticated) return <Navigate to={accountPath("login", returnTo)} replace />;
    if (session?.userId !== userId) return <Box sx={{ p: 5 }}>Открываем пространство…</Box>;
    return <WorkspaceLayout />;
}
