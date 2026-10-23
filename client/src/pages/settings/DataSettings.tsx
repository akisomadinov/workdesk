import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import { Link } from "react-router-dom";
import { useAuthSessionQuery } from "@/api/autogen/workdesk";
export default function DataSettings() {
    const { data: session } = useAuthSessionQuery();
    return (
        <Stack gap={3} sx={{ maxWidth: 720 }}>
            <Box>
                <Typography variant="h5">Данные</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {session?.sharedMode
                        ? "Материалы хранятся на сервере Workdesk."
                        : "Материалы хранятся на этом компьютере и доступны без VPN, пока приложение запущено."}
                </Typography>
            </Box>
            <Stack gap={1}>
                <Typography variant="h6">Экспорт</Typography>
                <Typography variant="body2" color="text.secondary">
                    Скачай копию доступных тебе задач и документов.
                </Typography>
                <Button
                    component="a"
                    href="/api/backup"
                    download="workdesk-backup.json"
                    variant="outlined"
                    startIcon={<DownloadOutlined />}
                    sx={{ alignSelf: "start", mt: 0.5 }}
                >
                    Скачать данные
                </Button>
            </Stack>
            <Divider />
            <Stack gap={1}>
                <Typography variant="h6">Корзина</Typography>
                <Typography variant="body2" color="text.secondary">
                    Удалённые задачи и документы можно восстановить.
                </Typography>
                <Button
                    component={Link}
                    to="/trash"
                    color="inherit"
                    variant="outlined"
                    sx={{ alignSelf: "start", mt: 0.5 }}
                >
                    Открыть корзину
                </Button>
            </Stack>
        </Stack>
    );
}
