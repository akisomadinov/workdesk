import { Avatar, Box, Button, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { useAuthSessionQuery } from "@/api/autogen/workdesk";
export default function GeneralSettings() {
    const { data: session } = useAuthSessionQuery();
    return (
        <Stack gap={2.5} sx={{ maxWidth: 620 }}>
            <Typography variant="h6">Профиль</Typography>
            <Stack direction="row" gap={1.5} alignItems="center">
                <Avatar sx={{ width: 42, height: 42, bgcolor: "action.selected", color: "text.secondary" }}>
                    {session?.authenticated ? session.name?.slice(0, 1) : "Я"}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={650} sx={{ overflowWrap: "anywhere" }}>
                        {session?.authenticated ? session.name : "Локальный режим"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {session?.login ? `@${session.login}` : "На этом компьютере, без входа"}
                    </Typography>
                </Box>
            </Stack>
            {!session?.authenticated && (
                <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Создай аккаунт, чтобы защитить вход паролем и приглашать людей. Твои задачи и документы
                        сохранятся.
                    </Typography>
                    <Button component={Link} to="/register" variant="outlined" size="small">
                        Создать аккаунт
                    </Button>
                </Box>
            )}
        </Stack>
    );
}
