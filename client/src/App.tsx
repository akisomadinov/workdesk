import { Suspense, useEffect, useState } from "react";
import {
    Alert,
    Avatar,
    Badge,
    Box,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Stack,
    Tooltip,
    Typography
} from "@mui/material";
import WbSunnyOutlined from "@mui/icons-material/WbSunnyOutlined";
import ViewKanbanOutlined from "@mui/icons-material/ViewKanbanOutlined";
import MenuRounded from "@mui/icons-material/MenuRounded";
import LayersRounded from "@mui/icons-material/LayersRounded";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import NotificationsOutlined from "@mui/icons-material/NotificationsOutlined";
import AssessmentOutlined from "@mui/icons-material/AssessmentOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import useGetPages, { NotesPage } from "@/hooks/useGetPages";
import { useAuthSessionQuery, useNotificationsGetQuery } from "@/api/autogen/workdesk";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import AccountPage from "@/pages/AccountPage";
import QuickSearch from "@/common/QuickSearch";
import WorkspaceSwitcher from "@/common/WorkspaceSwitcher";

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
    if (session?.sharedMode && !session.authenticated) return <AccountPage mode="login" />;
    if (session?.userId !== userId) return <Box sx={{ p: 5 }}>Открываем пространство…</Box>;
    return <WorkspaceLayout />;
}

function WorkspaceLayout() {
    const pages = useGetPages();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const { data: session } = useAuthSessionQuery();
    const { data: notifications = [] } = useNotificationsGetQuery(undefined, { pollingInterval: 30000 });
    const unread = notifications.filter((item) => !item.read).length;
    const navigation = [
        { path: "/", label: "Сегодня", icon: <WbSunnyOutlined /> },
        { path: "/board", label: "Задачи", icon: <ViewKanbanOutlined /> },
        { path: "/notes", label: "Документы", icon: <DescriptionOutlined /> },
        { path: "/team", label: "Команда", icon: <GroupsOutlined /> }
    ];
    function navItem(item: (typeof navigation)[number]) {
        const selected =
            location.pathname === item.path ||
            (item.path === "/notes" && location.pathname.startsWith("/notes/")) ||
            (item.path === "/board" && ["/inbox", "/archive"].includes(location.pathname));
        return (
            <ListItemButton
                key={item.path}
                component={Link}
                to={item.path}
                selected={selected}
                onClick={() => setMenuOpen(false)}
                sx={{
                    borderRadius: 1.5,
                    mb: 0.5,
                    py: 0.75,
                    color: selected ? "text.primary" : "text.secondary",
                    "&.Mui-selected": { bgcolor: "action.selected" }
                }}
            >
                <ListItemIcon
                    sx={{
                        minWidth: 32,
                        color: selected ? "primary.main" : "text.secondary",
                        "& svg": { fontSize: 20 }
                    }}
                >
                    {item.icon}
                </ListItemIcon>
                <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontSize: 13, fontWeight: selected ? 650 : 500 }}
                />
            </ListItemButton>
        );
    }
    const sidebar = (
        <Stack sx={{ height: "100%", p: 2 }}>
            <Stack direction="row" alignItems="center" gap={1} sx={{ px: 1, height: 40, mb: 3 }}>
                <LayersRounded color="primary" />
                <Typography fontWeight={750} fontSize={20} letterSpacing={-0.6}>
                    workdesk
                </Typography>
            </Stack>
            <Box sx={{ mb: 2 }}>
                <WorkspaceSwitcher onSelect={() => setMenuOpen(false)} />
            </Box>
            <List component="nav" aria-label="Основная навигация">
                {navigation.map(navItem)}
            </List>
            <Divider sx={{ my: 1.5 }} />
            <List component="nav" aria-label="Отчёты">
                {navItem({ path: "/reports", label: "Итоги по milestone", icon: <AssessmentOutlined /> })}
            </List>
            <Box sx={{ mt: "auto", pt: 4 }}>
                <Divider sx={{ my: 1.5 }} />
                <ListItemButton
                    component={Link}
                    to="/settings"
                    aria-label={`Настройки: ${session?.name ?? "Мой аккаунт"}`}
                    selected={location.pathname.startsWith("/settings")}
                    onClick={() => setMenuOpen(false)}
                    sx={{ px: 1, py: 1.25, gap: 1.2, borderRadius: 1.5 }}
                >
                    <Avatar
                        sx={{
                            width: 30,
                            height: 30,
                            bgcolor: "action.selected",
                            color: "text.secondary",
                            fontSize: 13
                        }}
                    >
                        {session?.name?.slice(0, 1) ?? "Я"}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography noWrap variant="body2" fontWeight={600}>
                            {session?.name ?? "Мой аккаунт"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Настройки
                        </Typography>
                    </Box>
                    <SettingsOutlined sx={{ fontSize: 18, color: "text.secondary", flexShrink: 0 }} />
                </ListItemButton>
            </Box>
        </Stack>
    );
    return (
        <Box sx={{ display: "flex", minHeight: "100vh" }}>
            <Box component="aside" sx={{ width: 220, flexShrink: 0, display: { xs: "none", md: "block" } }}>
                <Box
                    sx={{
                        width: 220,
                        height: "100dvh",
                        position: "fixed",
                        bgcolor: "background.default",
                        borderRight: 1,
                        borderColor: "divider",
                        overflowY: "auto"
                    }}
                >
                    {sidebar}
                </Box>
            </Box>
            <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} PaperProps={{ sx: { width: 260 } }}>
                {sidebar}
            </Drawer>
            <Box component="main" sx={{ flex: 1, minWidth: 0, bgcolor: "background.paper" }}>
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ px: { xs: 2, md: 4 }, height: 60, borderBottom: 1, borderColor: "divider" }}
                >
                    <Stack direction="row" gap={1} alignItems="center" sx={{ minWidth: 0 }}>
                        <IconButton
                            aria-label="Открыть меню"
                            onClick={() => setMenuOpen(true)}
                            sx={{ display: { md: "none" } }}
                        >
                            <MenuRounded />
                        </IconButton>
                        <WorkspaceSwitcher compact />
                    </Stack>
                    <Stack direction="row" gap={1} alignItems="center">
                        <QuickSearch />
                        <Tooltip title="Уведомления">
                            <IconButton
                                component={Link}
                                to="/notifications"
                                aria-label={`Уведомления: ${unread} непрочитанных`}
                            >
                                <Badge badgeContent={unread} max={99} color="primary">
                                    <NotificationsOutlined fontSize="small" />
                                </Badge>
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Stack>
                <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1800, mx: "auto" }}>
                    <Suspense fallback={<Typography role="status">Открываем страницу…</Typography>}>
                        <Routes>
                            {pages.map((page) => (
                                <Route key={page.path} path={page.path} element={page.component} />
                            ))}
                            <Route path="/notes/:id" element={<NotesPage />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </Suspense>
                </Box>
            </Box>
        </Box>
    );
}
