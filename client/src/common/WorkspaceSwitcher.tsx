import { useEffect, useState } from "react";
import { Avatar, Button, Divider, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import LayersOutlined from "@mui/icons-material/LayersOutlined";
import { useTeamGetQuery } from "@/api/autogen/workdesk";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import useSwitchWorkspace from "@/hooks/useSwitchWorkspace";
import { roleLabel } from "@/pages/team/roles";
export default function WorkspaceSwitcher() {
    const { scope } = useWorkspaceStore();
    const switchWorkspace = useSwitchWorkspace();
    const { data: spaces = [], isSuccess, isFetching, error } = useTeamGetQuery(undefined, { pollingInterval: 15000 });
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const selected = spaces.find((space) => space.id === scope);
    const name =
        scope === "mine" ? "Личное" : scope === "all" ? "Все пространства" : (selected?.name ?? "Пространство");
    useEffect(() => {
        if (isSuccess && !isFetching && scope !== "mine" && scope !== "all" && !selected) switchWorkspace("mine");
    }, [scope, selected, isSuccess, isFetching, switchWorkspace]);
    function choose(id: string) {
        switchWorkspace(id);
        setAnchor(null);
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
                sx={{ minWidth: 0, maxWidth: { xs: 160, sm: 300 }, px: 0.75, py: 0.75, gap: 1, textAlign: "left" }}
            >
                <Avatar
                    variant="rounded"
                    sx={{
                        width: 28,
                        height: 28,
                        fontSize: 12,
                        bgcolor: "action.selected",
                        color: "text.secondary",
                        display: { xs: "none", sm: "flex" }
                    }}
                >
                    {scope === "mine" ? (
                        <HomeOutlined sx={{ fontSize: 18 }} />
                    ) : scope === "all" ? (
                        <LayersOutlined sx={{ fontSize: 18 }} />
                    ) : (
                        name.slice(0, 2).toUpperCase()
                    )}
                </Avatar>
                <Typography component="span" variant="body2" fontWeight={600} noWrap>
                    {name}
                </Typography>
                <KeyboardArrowDownRounded sx={{ fontSize: 16, flexShrink: 0, color: "text.secondary" }} />
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
                        <HomeOutlined fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                        primary="Личное"
                        secondary="Твои материалы и назначенные задачи"
                        primaryTypographyProps={{ fontSize: 14 }}
                        secondaryTypographyProps={{ fontSize: 12, sx: { whiteSpace: "normal" } }}
                    />
                    {scope === "mine" && <CheckRounded fontSize="small" color="primary" />}
                </MenuItem>
                {!!spaces.length && <Divider />}
                {spaces.map((space) => (
                    <MenuItem key={space.id} selected={space.id === scope} onClick={() => choose(space.id ?? "mine")}>
                        <ListItemIcon>
                            <Avatar
                                variant="rounded"
                                sx={{
                                    width: 26,
                                    height: 26,
                                    fontSize: 11,
                                    bgcolor: "action.selected",
                                    color: "text.primary"
                                }}
                            >
                                {space.name?.slice(0, 2).toUpperCase()}
                            </Avatar>
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
            </Menu>
        </>
    );
}
