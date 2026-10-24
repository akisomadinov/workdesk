import { lazy, Suspense } from "react";
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Stack, Typography } from "@mui/material";
import TuneRounded from "@mui/icons-material/TuneRounded";
import CableRounded from "@mui/icons-material/CableRounded";
import Telegram from "@mui/icons-material/Telegram";
import StorageRounded from "@mui/icons-material/StorageRounded";
import { Link, Navigate, useLocation } from "react-router-dom";
import GeneralSettings from "./settings/GeneralSettings";
import DataSettings from "./settings/DataSettings";
const ConnectionsPage = lazy(() => import("./ConnectionsPage"));
const NotificationSettings = lazy(() => import("./settings/NotificationSettings"));
const sections = [
    { path: "/settings", label: "Общее", icon: <TuneRounded />, content: <GeneralSettings /> },
    { path: "/settings/connections", label: "GitLab и GitHub", icon: <CableRounded />, content: <ConnectionsPage /> },
    {
        path: "/settings/notifications",
        label: "Telegram",
        icon: <Telegram />,
        content: <NotificationSettings />
    },
    { path: "/settings/data", label: "Данные", icon: <StorageRounded />, content: <DataSettings /> }
];
export default function SettingsPage() {
    const { pathname } = useLocation();
    const current = sections.find((section) => section.path === pathname.replace(/\/$/, ""));
    if (!current) return <Navigate to="/settings" replace />;
    return (
        <Stack gap={{ xs: 2, md: 3 }} sx={{ maxWidth: 1080 }}>
            <Typography variant="h4">Настройки</Typography>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "176px minmax(0, 1fr)" },
                    gap: { xs: 3, md: 5 },
                    alignItems: "start"
                }}
            >
                <List
                    component="nav"
                    aria-label="Разделы настроек"
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "repeat(2, minmax(0, 1fr))",
                            sm: "repeat(4, minmax(0, 1fr))",
                            md: "minmax(0, 1fr)"
                        },
                        gap: 0.5,
                        p: 0
                    }}
                >
                    {sections.map((section) => (
                        <ListItemButton
                            key={section.path}
                            component={Link}
                            to={section.path}
                            selected={section === current}
                            aria-current={section === current ? "page" : undefined}
                            sx={{ borderRadius: 1.5, px: { xs: 1, md: 1.5 }, minWidth: 0 }}
                        >
                            <ListItemIcon
                                sx={{
                                    minWidth: 30,
                                    color: section === current ? "primary.main" : "text.secondary",
                                    "& svg": { fontSize: 19 }
                                }}
                            >
                                {section.icon}
                            </ListItemIcon>
                            <ListItemText
                                primary={section.label}
                                primaryTypographyProps={{ fontSize: 13, fontWeight: section === current ? 650 : 500 }}
                            />
                        </ListItemButton>
                    ))}
                </List>
                <Box component="section" aria-label={current.label} sx={{ minWidth: 0 }}>
                    <Suspense
                        fallback={
                            <Typography role="status" color="text.secondary">
                                Загружаем настройки…
                            </Typography>
                        }
                    >
                        {current.content}
                    </Suspense>
                </Box>
            </Box>
        </Stack>
    );
}
