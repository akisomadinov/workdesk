import { Suspense, useState } from "react";
import { Badge, Box, Drawer, IconButton, Stack, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material";
import MenuRounded from "@mui/icons-material/MenuRounded";
import MenuOpenRounded from "@mui/icons-material/MenuOpenRounded";
import NotificationsOutlined from "@mui/icons-material/NotificationsOutlined";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import useGetPages, { NotesPage } from "@/hooks/useGetPages";
import { useNotificationsGetQuery } from "@/api/autogen/workdesk";
import { usePreferences } from "@/stores/usePreferences";
import QuickSearch from "@/common/QuickSearch";
import WorkspaceSwitcher from "@/common/WorkspaceSwitcher";
import Sidebar from "./Sidebar";
import ThemeMenu from "./ThemeMenu";
import AccountMenu from "./AccountMenu";

export default function WorkspaceLayout() {
    const pages = useGetPages();
    const [menuOpen, setMenuOpen] = useState(false);
    const { sidebarCollapsed, toggleSidebar } = usePreferences();
    const desktop = useMediaQuery(useTheme().breakpoints.up("md"));
    const { data: notifications = [] } = useNotificationsGetQuery(undefined, { pollingInterval: 30000 });
    const unread = notifications.filter((item) => !item.read).length;
    const width = sidebarCollapsed ? 64 : 216;
    const menuLabel = desktop ? (sidebarCollapsed ? "Развернуть панель" : "Свернуть панель") : "Открыть меню";
    return (
        <Box sx={{ display: "flex", minHeight: "100dvh" }}>
            {desktop && (
                <Box component="aside" id="workspace-sidebar" sx={{ width, flexShrink: 0 }}>
                    <Box
                        sx={{
                            width,
                            height: "100dvh",
                            position: "fixed",
                            bgcolor: "background.default",
                            borderRight: 1,
                            borderColor: "divider",
                            overflowY: "auto",
                            overflowX: "hidden"
                        }}
                    >
                        <Sidebar collapsed={sidebarCollapsed} />
                    </Box>
                </Box>
            )}
            <Drawer
                open={!desktop && menuOpen}
                onClose={() => setMenuOpen(false)}
                slotProps={{ paper: { sx: { width: 240 } } }}
            >
                <Sidebar onSelect={() => setMenuOpen(false)} />
            </Drawer>
            <Box sx={{ flex: 1, minWidth: 0, bgcolor: "background.paper" }}>
                <Stack
                    component="header"
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ px: { xs: 1, sm: 2.5 }, height: 60, borderBottom: 1, borderColor: "divider", gap: 0.5 }}
                >
                    <Stack direction="row" gap={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                        <Tooltip title={menuLabel}>
                            <IconButton
                                aria-label={menuLabel}
                                aria-expanded={desktop ? !sidebarCollapsed : menuOpen}
                                onClick={() => (desktop ? toggleSidebar() : setMenuOpen(true))}
                                sx={{ width: 40, height: 40 }}
                            >
                                {desktop && !sidebarCollapsed ? (
                                    <MenuOpenRounded fontSize="small" />
                                ) : (
                                    <MenuRounded fontSize="small" />
                                )}
                            </IconButton>
                        </Tooltip>
                        <WorkspaceSwitcher />
                    </Stack>
                    <Stack direction="row" gap={{ xs: 0, sm: 0.5 }} alignItems="center" sx={{ flexShrink: 0 }}>
                        <QuickSearch />
                        <ThemeMenu />
                        <Tooltip title="Уведомления">
                            <IconButton
                                component={Link}
                                to="/notifications"
                                aria-label={`Уведомления: ${unread} непрочитанных`}
                                sx={{ width: 40, height: 40 }}
                            >
                                <Badge badgeContent={unread} max={99} color="primary">
                                    <NotificationsOutlined fontSize="small" />
                                </Badge>
                            </IconButton>
                        </Tooltip>
                        <AccountMenu />
                    </Stack>
                </Stack>
                <Box component="main" sx={{ p: { xs: 2, md: 4 }, maxWidth: 1800, mx: "auto" }}>
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
