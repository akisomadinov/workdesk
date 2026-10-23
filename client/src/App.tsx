import { Suspense, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Stack,
    MenuItem,
    TextField,
    Typography
} from "@mui/material";
import WbSunnyOutlined from "@mui/icons-material/WbSunnyOutlined";
import ViewKanbanOutlined from "@mui/icons-material/ViewKanbanOutlined";
import InboxOutlined from "@mui/icons-material/InboxOutlined";
import ArchiveOutlined from "@mui/icons-material/ArchiveOutlined";
import CableRounded from "@mui/icons-material/CableRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import LayersRounded from "@mui/icons-material/LayersRounded";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import NotificationsOutlined from "@mui/icons-material/NotificationsOutlined";
import AssessmentOutlined from "@mui/icons-material/AssessmentOutlined";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import useGetPages, { NotesPage } from "@/hooks/useGetPages";
import {
    useConnectionsGetQuery,
    useAuthSessionQuery,
    useAuthLogoutMutation,
    useTeamGetQuery
} from "@/api/autogen/workdesk";
import { usePreferences } from "@/stores/usePreferences";
import type { ThemeMode } from "@/stores/usePreferences";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { store } from "@/app/store";
import { api } from "@/api/api";
import AccountPage from "@/pages/AccountPage";
import QuickSearch from "@/common/QuickSearch";
export default function App() {
    const location = useLocation();
    const { data: session, isLoading, error } = useAuthSessionQuery(undefined, { pollingInterval: 60000 });
    if (location.pathname === "/join") return <AccountPage mode="join" />;
    if (isLoading) return <Box sx={{ p: 5 }}>Открываем Workdesk…</Box>;
    if (error)
        return (
            <Box sx={{ p: 4 }}>
                <Alert severity="error">Не удалось связаться с приложением. Проверь, что оно запущено.</Alert>
            </Box>
        );
    if (session?.sharedMode && !session.authenticated) return <AccountPage mode="login" />;
    return <WorkspaceLayout />;
}
function WorkspaceLayout() {
    const pages = useGetPages();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const { data: session } = useAuthSessionQuery();
    const { data: spaces = [] } = useTeamGetQuery();
    const { scope, setScope } = useWorkspaceStore();
    const preferences = usePreferences();
    const [logout] = useAuthLogoutMutation();
    const { data: connections = [] } = useConnectionsGetQuery(undefined, { pollingInterval: 15000 });
    const icons = [
        <WbSunnyOutlined />,
        <ViewKanbanOutlined />,
        <InboxOutlined />,
        <ArchiveOutlined />,
        <DescriptionOutlined />,
        <AssessmentOutlined />,
        <NotificationsOutlined />,
        <GroupsOutlined />,
        <CableRounded />
    ];
    const sidebar = (
        <Stack sx={{ height: "100%", px: 2.5, py: 3 }}>
            <Stack direction="row" gap={1.2} alignItems="center" sx={{ px: 1, mb: 0.5 }}>
                <Box
                    sx={{
                        width: 32,
                        height: 32,
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        borderRadius: 2,
                        display: "grid",
                        placeItems: "center"
                    }}
                >
                    <LayersRounded fontSize="small" />
                </Box>
                <Typography fontWeight={800} fontSize={21} letterSpacing={-0.6}>
                    workdesk
                    <Box component="span" sx={{ fontWeight: 400 }}>
                        .
                    </Box>
                </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ px: 1, mb: 4, mt: 0.5 }}>
                Место для твоей работы
            </Typography>
            <Typography variant="overline" color="text.disabled" sx={{ px: 1, fontSize: 10, letterSpacing: 1.2 }}>
                РАБОЧЕЕ ПРОСТРАНСТВО
            </Typography>
            <TextField
                select
                size="small"
                label="Пространство"
                value={scope}
                onChange={(event) => setScope(event.target.value)}
                sx={{ my: 1.5 }}
            >
                <MenuItem value="mine">Моя работа</MenuItem>
                <MenuItem value="all">Всё доступное</MenuItem>
                {spaces.map((space) => (
                    <MenuItem key={space.id} value={space.id}>
                        {space.name}
                    </MenuItem>
                ))}
            </TextField>
            <List sx={{ mt: 0.5 }}>
                {pages.map((page, index) => (
                    <ListItemButton
                        key={page.path}
                        component={Link}
                        to={page.path}
                        selected={
                            location.pathname === page.path ||
                            (page.path === "/notes" && location.pathname.startsWith("/notes/"))
                        }
                        onClick={() => setMenuOpen(false)}
                        sx={{
                            my: 0.5,
                            px: 1.5,
                            py: 0.8,
                            borderRadius: 2,
                            color: "text.secondary",
                            "&.Mui-selected": { bgcolor: "primary.light", color: "primary.main" },
                            "&.Mui-selected .MuiListItemIcon-root": { color: "primary.main" }
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 34, color: "text.secondary", "& svg": { fontSize: 20 } }}>
                            {icons[index]}
                        </ListItemIcon>
                        <ListItemText
                            primary={page.label}
                            primaryTypographyProps={{
                                fontSize: 13,
                                fontWeight: location.pathname === page.path ? 650 : 500
                            }}
                        />
                    </ListItemButton>
                ))}
            </List>
            {connections.length > 0 && (
                <>
                    <Divider sx={{ my: 2 }} />
                    <Typography
                        variant="overline"
                        color="text.disabled"
                        sx={{ px: 1, fontSize: 10, letterSpacing: 1.2 }}
                    >
                        ИСТОЧНИКИ
                    </Typography>
                    <Stack gap={1.5} sx={{ px: 1, pt: 1.5 }}>
                        {connections.map((source) => (
                            <Stack direction="row" key={source.id} gap={1} alignItems="center">
                                <Box
                                    sx={{
                                        width: 6,
                                        height: 6,
                                        flexShrink: 0,
                                        borderRadius: "50%",
                                        bgcolor:
                                            source.enabled && source.health === "ok" ? "success.main" : "text.disabled"
                                    }}
                                />
                                <Typography variant="caption" noWrap color="text.secondary">
                                    {source.name}
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                </>
            )}
            <Box sx={{ mt: "auto", pt: 4 }}>
                <TextField
                    select
                    label="Тема"
                    value={preferences.theme}
                    onChange={(event) => preferences.setTheme(event.target.value as ThemeMode)}
                    sx={{ mb: 2 }}
                >
                    <MenuItem value="system">Как в системе</MenuItem>
                    <MenuItem value="light">Светлая</MenuItem>
                    <MenuItem value="dark">Тёмная</MenuItem>
                </TextField>
                <Box sx={{ bgcolor: "background.default", p: 1.5, borderRadius: 2 }}>
                    <Typography variant="caption" fontWeight={650}>
                        {session?.sharedMode ? "Сохранено на сервере" : "Сохранено на компьютере"}
                    </Typography>
                    <Typography
                        display="block"
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 0.5, lineHeight: 1.6 }}
                    >
                        {session?.sharedMode ? "Для доступа нужен сервер Workdesk." : "Заметки доступны без VPN."}
                        <br />
                        Приложение должно быть запущено.
                    </Typography>
                </Box>
                <Button
                    component="a"
                    href="/api/backup"
                    download="workdesk-backup.json"
                    startIcon={<DownloadOutlined />}
                    size="small"
                    color="inherit"
                    sx={{ mt: 1.5 }}
                >
                    Экспорт данных
                </Button>
                <Typography variant="caption" display="block" color="text.disabled" sx={{ px: 1, mt: 2 }}>
                    {session?.sharedMode ? "Командная" : "Локальная"} версия · 0.2
                </Typography>
            </Box>
        </Stack>
    );
    return (
        <Box sx={{ display: "flex", minHeight: "100vh" }}>
            <Box component="aside" sx={{ width: 232, flexShrink: 0, display: { xs: "none", md: "block" } }}>
                <Box
                    sx={{
                        width: 232,
                        height: "100dvh",
                        position: "fixed",
                        bgcolor: "background.paper",
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
            <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                        px: { xs: 2, md: 4 },
                        height: 64,
                        borderBottom: 1,
                        borderColor: "divider",
                        bgcolor: "background.paper"
                    }}
                >
                    <Stack direction="row" gap={1} alignItems="center">
                        <Box sx={{ display: { xs: "none", sm: "block" } }}>
                            <QuickSearch />
                        </Box>
                        <IconButton
                            aria-label="Открыть меню"
                            onClick={() => setMenuOpen(true)}
                            sx={{ display: { md: "none" } }}
                        >
                            <MenuRounded />
                        </IconButton>
                        <Typography variant="caption" color="text.secondary">
                            Моя работа{" "}
                            <Box component="span" sx={{ mx: 1.5, color: "text.disabled" }}>
                                /
                            </Box>
                            {
                                pages.find(
                                    (page) =>
                                        page.path === location.pathname ||
                                        (page.path === "/notes" && location.pathname.startsWith("/notes/"))
                                )?.label
                            }
                        </Typography>
                    </Stack>
                    <Stack direction="row" gap={1} alignItems="center">
                        <Box sx={{ width: 6, height: 6, bgcolor: "success.main", borderRadius: "50%" }} />
                        <Typography variant="caption" color="text.secondary">
                            {session?.name ?? "Моё пространство"}
                        </Typography>
                        <Box
                            sx={{
                                width: 29,
                                height: 29,
                                borderRadius: "50%",
                                bgcolor: "primary.light",
                                color: "primary.main",
                                display: "grid",
                                placeItems: "center",
                                fontWeight: 700,
                                fontSize: 12,
                                ml: 1
                            }}
                        >
                            Я
                        </Box>
                        {session?.authenticated && (
                            <Button
                                size="small"
                                color="inherit"
                                onClick={async () => {
                                    await logout().unwrap();
                                    store.dispatch(api.util.resetApiState());
                                    setScope("mine");
                                }}
                            >
                                Выйти
                            </Button>
                        )}
                    </Stack>
                </Stack>
                <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1800, mx: "auto" }}>
                    <Suspense fallback={<Typography role="status">Открываем страницу…</Typography>}>
                        <Routes>
                            {pages.map((page) => (
                                <Route key={page.path} path={page.path} element={page.component} />
                            ))}
                            <Route path="/notes/:id" element={<NotesPage />} />
                            <Route
                                path="*"
                                element={
                                    <>
                                        <Alert severity="info">Такой страницы нет.</Alert>
                                        <Navigate to="/" replace />
                                    </>
                                }
                            />
                        </Routes>
                    </Suspense>
                </Box>
            </Box>
        </Box>
    );
}
