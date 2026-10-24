import { useEffect } from "react";
import { Alert, Box } from "@mui/material";
import { useLocation } from "react-router-dom";
import { useAuthSessionQuery } from "@/api/autogen/workdesk";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import AccountPage from "@/pages/AccountPage";
import WorkspaceLayout from "@/common/layout/WorkspaceLayout";

export default function App() {
    const location = useLocation();
    const { data: session, isLoading, error } = useAuthSessionQuery(undefined, { pollingInterval: 60000 });
    const { userId, bindUser } = useWorkspaceStore();
    useEffect(() => {
        if (session?.userId) bindUser(session.userId);
    }, [session?.userId, bindUser]);
    if (location.pathname === "/join") return <AccountPage mode="join" />;
    if (isLoading) return <Box sx={{ p: 5 }}>Открываем Workdesk…</Box>;
    if (error)
        return (
            <Box sx={{ p: 4 }}>
                <Alert severity="error">Не удалось связаться с приложением. Проверь, что оно запущено.</Alert>
            </Box>
        );
    if ((session?.sharedMode || session?.setupRequired === false) && !session?.authenticated)
        return <AccountPage mode="login" />;
    if (session?.userId !== userId) return <Box sx={{ p: 5 }}>Открываем пространство…</Box>;
    return <WorkspaceLayout />;
}
