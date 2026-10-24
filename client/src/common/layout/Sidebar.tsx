import { Box, List, ListItemButton, ListItemIcon, ListItemText, Stack, Tooltip, Typography } from "@mui/material";
import WbSunnyOutlined from "@mui/icons-material/WbSunnyOutlined";
import ViewKanbanOutlined from "@mui/icons-material/ViewKanbanOutlined";
import LayersRounded from "@mui/icons-material/LayersRounded";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import MergeTypeRounded from "@mui/icons-material/MergeTypeRounded";
import AssessmentOutlined from "@mui/icons-material/AssessmentOutlined";
import { Link, useLocation } from "react-router-dom";

const navigation = [
    { path: "/", label: "Сегодня", icon: <WbSunnyOutlined /> },
    { path: "/board", label: "Задачи", icon: <ViewKanbanOutlined /> },
    { path: "/merge-requests", label: "Мои MR", icon: <MergeTypeRounded /> },
    { path: "/notes", label: "Документы", icon: <DescriptionOutlined /> },
    { path: "/team", label: "Команда", icon: <GroupsOutlined /> },
    { path: "/reports", label: "Итоги", icon: <AssessmentOutlined /> }
];

export default function Sidebar({ collapsed = false, onSelect }: { collapsed?: boolean; onSelect?: () => void }) {
    const { pathname } = useLocation();
    return (
        <Stack sx={{ height: "100%", px: collapsed ? 1 : 1.5 }}>
            <Stack
                direction="row"
                alignItems="center"
                justifyContent={collapsed ? "center" : "start"}
                gap={1}
                sx={{ height: 60, flexShrink: 0, px: collapsed ? 0 : 1.5 }}
            >
                <LayersRounded color="primary" aria-hidden />
                {!collapsed && (
                    <Typography fontWeight={750} fontSize={20} letterSpacing={-0.6}>
                        workdesk
                    </Typography>
                )}
            </Stack>
            <Box component="nav" aria-label="Основная навигация" sx={{ pt: 2 }}>
                <List disablePadding>
                    {navigation.map((item) => {
                        const selected =
                            pathname === item.path ||
                            (item.path !== "/" && pathname.startsWith(item.path + "/")) ||
                            (item.path === "/board" && ["/inbox", "/archive"].includes(pathname));
                        return (
                            <Tooltip key={item.path} title={collapsed ? item.label : ""} placement="right">
                                <ListItemButton
                                    component={Link}
                                    to={item.path}
                                    selected={selected}
                                    onClick={onSelect}
                                    aria-label={item.label}
                                    aria-current={selected ? "page" : undefined}
                                    sx={{
                                        borderRadius: 1.5,
                                        mb: 0.5,
                                        minHeight: 42,
                                        px: collapsed ? 0 : 1.5,
                                        justifyContent: collapsed ? "center" : "start",
                                        color: selected ? "text.primary" : "text.secondary",
                                        "&.Mui-selected": { bgcolor: "action.selected" }
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: collapsed ? 0 : 34,
                                            color: selected ? "primary.main" : "text.secondary",
                                            "& svg": { fontSize: 21 }
                                        }}
                                    >
                                        {item.icon}
                                    </ListItemIcon>
                                    {!collapsed && (
                                        <ListItemText
                                            primary={item.label}
                                            primaryTypographyProps={{ fontSize: 13, fontWeight: selected ? 650 : 500 }}
                                        />
                                    )}
                                </ListItemButton>
                            </Tooltip>
                        );
                    })}
                </List>
            </Box>
        </Stack>
    );
}
