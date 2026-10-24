import { useState } from "react";
import {
    Alert,
    Avatar,
    Box,
    Divider,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Tooltip,
    Typography
} from "@mui/material";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import LoginRounded from "@mui/icons-material/LoginRounded";
import CableRounded from "@mui/icons-material/CableRounded";
import { Link } from "react-router-dom";
import { useAuthSessionQuery } from "@/api/autogen/workdesk";
import useSignOut from "@/hooks/useSignOut";
import { message } from "@/common/models";

export default function AccountMenu() {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const { data: session } = useAuthSessionQuery();
    const { signOut, isLoading, error } = useSignOut();
    const name = session?.authenticated ? session.name : "Локальный режим";
    return (
        <>
            <Tooltip title={session?.authenticated ? `Аккаунт: ${name}` : "Аккаунт · локальный режим"}>
                <IconButton
                    aria-label="Меню аккаунта"
                    aria-haspopup="menu"
                    aria-expanded={!!anchor}
                    onClick={(event) => setAnchor(event.currentTarget)}
                    sx={{ width: 40, height: 40 }}
                >
                    <Avatar
                        sx={{ width: 28, height: 28, fontSize: 12, bgcolor: "action.selected", color: "text.primary" }}
                    >
                        {session?.authenticated ? name?.slice(0, 1) : <PersonOutlineRounded sx={{ fontSize: 19 }} />}
                    </Avatar>
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={anchor}
                open={!!anchor}
                onClose={() => setAnchor(null)}
                slotProps={{ paper: { sx: { width: 260 } }, list: { "aria-label": "Аккаунт" } }}
            >
                <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="body2" fontWeight={650} sx={{ overflowWrap: "anywhere" }}>
                        {name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {session?.authenticated ? `@${session.login}` : "На этом компьютере, без входа"}
                    </Typography>
                </Box>
                <Divider />
                <MenuItem component={Link} to="/settings" onClick={() => setAnchor(null)}>
                    <ListItemIcon>
                        <SettingsOutlined fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Настройки</ListItemText>
                </MenuItem>
                <MenuItem component={Link} to="/settings/connections" onClick={() => setAnchor(null)}>
                    <ListItemIcon>
                        <CableRounded fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>GitLab и GitHub</ListItemText>
                </MenuItem>
                {session?.authenticated ? (
                    <MenuItem disabled={isLoading} onClick={() => void signOut().catch(() => {})}>
                        <ListItemIcon>
                            <LogoutRounded fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{isLoading ? "Выходим…" : "Выйти"}</ListItemText>
                    </MenuItem>
                ) : (
                    <MenuItem
                        component={Link}
                        to={session?.setupRequired ? "/register" : "/login"}
                        onClick={() => setAnchor(null)}
                    >
                        <ListItemIcon>
                            <LoginRounded fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{session?.setupRequired ? "Создать аккаунт" : "Войти"}</ListItemText>
                    </MenuItem>
                )}
                {error && (
                    <Alert severity="error" sx={{ mx: 1 }}>
                        {message(error)}
                    </Alert>
                )}
            </Menu>
        </>
    );
}
