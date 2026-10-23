import { Alert, Avatar, Box, Button, Divider, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import BrightnessAutoOutlined from "@mui/icons-material/BrightnessAutoOutlined";
import { Link } from "react-router-dom";
import { useAuthLogoutMutation, useAuthSessionQuery } from "@/api/autogen/workdesk";
import { usePreferences } from "@/stores/usePreferences";
import type { ThemeMode } from "@/stores/usePreferences";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { store } from "@/app/store";
import { api } from "@/api/api";
import { message } from "@/common/models";
export default function GeneralSettings() {
    const { theme, setTheme } = usePreferences();
    const { data: session } = useAuthSessionQuery();
    const [logout, { isLoading, error }] = useAuthLogoutMutation();
    const { setScope } = useWorkspaceStore();
    return (
        <Stack gap={3.5} sx={{ maxWidth: 720 }}>
            <Stack gap={2}>
                <Typography variant="h6">Профиль</Typography>
                <Stack direction="row" gap={1.5} alignItems="center">
                    <Avatar sx={{ width: 42, height: 42, bgcolor: "action.selected", color: "text.secondary" }}>
                        {session?.name?.slice(0, 1) ?? "Я"}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={650} sx={{ overflowWrap: "anywhere" }}>
                            {session?.name ?? "Мой аккаунт"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {session?.login ? `@${session.login}` : "Локальное пространство"}
                        </Typography>
                    </Box>
                </Stack>
                {error && <Alert severity="error">{message(error)}</Alert>}
                {session?.authenticated ? (
                    <Button
                        color="inherit"
                        variant="outlined"
                        size="small"
                        disabled={isLoading}
                        sx={{ alignSelf: "start" }}
                        onClick={async () => {
                            try {
                                await logout().unwrap();
                                store.dispatch(api.util.resetApiState());
                                setScope("mine");
                            } catch {
                                /* Mutation error is displayed above. */
                            }
                        }}
                    >
                        {isLoading ? "Выходим…" : "Выйти из аккаунта"}
                    </Button>
                ) : (
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Создай аккаунт, чтобы приглашать людей и работать в команде.
                        </Typography>
                        <Button component={Link} to="/team" variant="outlined" size="small">
                            Настроить аккаунт
                        </Button>
                    </Box>
                )}
            </Stack>
            <Divider />
            <Stack gap={1.5}>
                <Box>
                    <Typography variant="h6">Тема оформления</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Сохраняется в этом браузере.
                    </Typography>
                </Box>
                <ToggleButtonGroup
                    value={theme}
                    exclusive
                    onChange={(_, value: ThemeMode | null) => {
                        if (value) setTheme(value);
                    }}
                    aria-label="Тема оформления"
                    sx={{
                        alignSelf: "start",
                        width: { xs: "100%", sm: "auto" },
                        "& .MuiToggleButton-root": {
                            flex: { xs: 1, sm: "initial" },
                            gap: 0.75,
                            px: { xs: 1, sm: 2 },
                            py: 1,
                            fontSize: 12,
                            textTransform: "none"
                        }
                    }}
                >
                    <ToggleButton value="light">
                        <LightModeOutlined sx={{ fontSize: 17 }} />
                        Светлая
                    </ToggleButton>
                    <ToggleButton value="dark">
                        <DarkModeOutlined sx={{ fontSize: 17 }} />
                        Тёмная
                    </ToggleButton>
                    <ToggleButton value="system" title="Как в системе">
                        <BrightnessAutoOutlined sx={{ fontSize: 17 }} />
                        Авто
                    </ToggleButton>
                </ToggleButtonGroup>
            </Stack>
        </Stack>
    );
}
