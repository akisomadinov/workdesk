import { useEffect, useState } from "react";
import { Box, Button, Divider, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import UnfoldMoreRounded from "@mui/icons-material/UnfoldMoreRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import LayersOutlined from "@mui/icons-material/LayersOutlined";
import { Link } from "react-router-dom";
import { useTeamGetQuery } from "@/api/autogen/workdesk";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import useSwitchWorkspace from "@/hooks/useSwitchWorkspace";
import { roleLabel } from "@/pages/team/roles";
export default function WorkspaceSwitcher({ compact = false, onSelect }: { compact?: boolean; onSelect?: () => void }) {
    const { scope } = useWorkspaceStore();
    const switchWorkspace = useSwitchWorkspace();
    const { data: spaces = [], isSuccess, isFetching, error } = useTeamGetQuery(undefined, { pollingInterval: 15000 });
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const selected = spaces.find((space) => space.id === scope);
    const name =
        scope === "mine" ? "Моя работа" : scope === "all" ? "Все пространства" : (selected?.name ?? "Пространство");
    useEffect(() => {
        if (isSuccess && !isFetching && scope !== "mine" && scope !== "all" && !selected) switchWorkspace("mine");
    }, [scope, selected, isSuccess, isFetching, switchWorkspace]);
    function choose(id: string) {
        switchWorkspace(id);
        setAnchor(null);
        onSelect?.();
    }
    return (
        <>
            <Button
                color="inherit"
                aria-label={`Сменить пространство: ${name}`}
                title={name}
                aria-haspopup="menu"
                aria-expanded={!!anchor}
                onClick={(event) => setAnchor(event.currentTarget)}
                sx={{
                    minWidth: 0,
                    width: compact ? "auto" : "100%",
                    maxWidth: compact ? { xs: 160, sm: 300 } : "none",
                    px: compact ? 0.5 : 1.25,
                    py: compact ? 0.75 : 1.25,
                    justifyContent: "space-between",
                    gap: 1,
                    border: compact ? 0 : 1,
                    borderColor: "divider",
                    textAlign: "left"
                }}
            >
                <Box component="span" sx={{ minWidth: 0 }}>
                    {!compact && (
                        <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mb: 0.25 }}
                        >
                            Пространство
                        </Typography>
                    )}
                    <Typography component="span" variant="body2" fontWeight={600} noWrap sx={{ display: "block" }}>
                        {name}
                    </Typography>
                </Box>
                <UnfoldMoreRounded sx={{ fontSize: 18, flexShrink: 0, color: "text.secondary" }} />
            </Button>
            <Menu
                anchorEl={anchor}
                open={!!anchor}
                onClose={() => setAnchor(null)}
                slotProps={{
                    paper: { sx: { width: 300, maxWidth: "calc(100vw - 32px)", maxHeight: "min(520px, 80dvh)" } }
                }}
            >
                <MenuItem selected={scope === "mine"} onClick={() => choose("mine")}>
                    <ListItemIcon>
                        <PersonOutlineRounded fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                        primary="Моя работа"
                        secondary="Личное и назначенные тебе задачи"
                        primaryTypographyProps={{ fontSize: 14 }}
                        secondaryTypographyProps={{ fontSize: 12, sx: { whiteSpace: "normal" } }}
                    />
                    {scope === "mine" && <CheckRounded fontSize="small" color="primary" />}
                </MenuItem>
                {!!spaces.length && <Divider />}
                {spaces.map((space) => (
                    <MenuItem key={space.id} selected={space.id === scope} onClick={() => choose(space.id ?? "mine")}>
                        <ListItemIcon>
                            <GroupsOutlined fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                            primary={space.name}
                            secondary={roleLabel(space.role)}
                            primaryTypographyProps={{
                                fontSize: 14,
                                sx: { overflowWrap: "anywhere", whiteSpace: "normal" }
                            }}
                            secondaryTypographyProps={{ fontSize: 12 }}
                        />
                        {space.id === scope && <CheckRounded fontSize="small" color="primary" />}
                    </MenuItem>
                ))}
                {error && <MenuItem disabled>Не удалось загрузить команды</MenuItem>}
                <Divider />
                <MenuItem selected={scope === "all"} onClick={() => choose("all")}>
                    <ListItemIcon>
                        <LayersOutlined fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Все пространства" primaryTypographyProps={{ fontSize: 14 }} />
                    {scope === "all" && <CheckRounded fontSize="small" color="primary" />}
                </MenuItem>
                <MenuItem
                    component={Link}
                    to="/team"
                    onClick={() => {
                        setAnchor(null);
                        onSelect?.();
                    }}
                >
                    <ListItemIcon>
                        <GroupsOutlined fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Управление командой" primaryTypographyProps={{ fontSize: 14 }} />
                </MenuItem>
            </Menu>
        </>
    );
}
