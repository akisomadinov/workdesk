import { Box, Button, Divider, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useAuthLogoutMutation, useAuthSessionQuery } from "@/api/autogen/workdesk";
import { usePreferences } from "@/stores/usePreferences";
import type { ThemeMode } from "@/stores/usePreferences";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { store } from "@/app/store";
import { api } from "@/api/api";
import { Link } from "react-router-dom";
export default function SettingsPage() {
    const preferences = usePreferences();
    const { data: session } = useAuthSessionQuery();
    const [logout] = useAuthLogoutMutation();
    const { setScope } = useWorkspaceStore();
    return (
        <Stack gap={4} sx={{ maxWidth: 640 }}>
            <Typography variant="h4">Настройки</Typography>
            <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                    Внешний вид
                </Typography>
                <TextField
                    select
                    label="Тема"
                    value={preferences.theme}
                    onChange={(event) => preferences.setTheme(event.target.value as ThemeMode)}
                >
                    <MenuItem value="system">Как в системе</MenuItem>
                    <MenuItem value="light">Светлая</MenuItem>
                    <MenuItem value="dark">Тёмная</MenuItem>
                </TextField>
            </Box>
            <Divider />
            <Box>
                <Typography variant="h6">Аккаунт</Typography>
                <Typography color="text.secondary" variant="body2" sx={{ my: 1 }}>
                    {session?.name}
                    {session?.login ? ` · @${session.login}` : ""}
                </Typography>
                {session?.authenticated ? (
                    <Button
                        color="inherit"
                        variant="outlined"
                        onClick={async () => {
                            await logout().unwrap();
                            store.dispatch(api.util.resetApiState());
                            setScope("mine");
                        }}
                    >
                        Выйти из аккаунта
                    </Button>
                ) : (
                    <Button component={Link} to="/team">
                        Настроить аккаунт для команды
                    </Button>
                )}
            </Box>
            <Divider />
            <Box>
                <Typography variant="h6">Данные</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>
                    {session?.sharedMode
                        ? "Материалы хранятся на сервере Workdesk."
                        : "Материалы хранятся на этом компьютере и доступны без VPN, пока приложение запущено."}
                </Typography>
                <Button component="a" href="/api/backup" download="workdesk-backup.json" variant="outlined">
                    Экспорт данных
                </Button>
            </Box>
        </Stack>
    );
}
