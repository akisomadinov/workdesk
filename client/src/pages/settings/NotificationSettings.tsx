import {
    Alert,
    Box,
    Button,
    CircularProgress,
    FormControlLabel,
    Link as MuiLink,
    Stack,
    Switch,
    TextField,
    Typography
} from "@mui/material";
import { Link } from "react-router-dom";
import useTelegramSettings from "@/hooks/useTelegramSettings";
export default function NotificationSettings() {
    const { form, settings, isLoading, error, saved, submit } = useTelegramSettings();
    const busy = isLoading || form.formState.isSubmitting || !settings;
    return (
        <Stack gap={3} sx={{ maxWidth: 720 }}>
            <Box>
                <Typography variant="h5">Уведомления</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Новые задачи, комментарии в MR/PR и приглашения появляются в ленте уведомлений.
                </Typography>
                <Button component={Link} to="/notifications" size="small" sx={{ mt: 1 }}>
                    Открыть ленту
                </Button>
            </Box>
            <Box component="form" onSubmit={submit}>
                <Stack gap={2}>
                    <Box>
                        <Typography variant="h6">Telegram</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Получай заголовок события и ссылку в Telegram. Текст рабочих заметок не отправляется.
                        </Typography>
                    </Box>
                    {isLoading && <CircularProgress size={20} aria-label="Загрузка настроек уведомлений" />}
                    <FormControlLabel
                        control={
                            <Switch {...form.register("enabled")} checked={form.watch("enabled")} disabled={busy} />
                        }
                        label={<Typography variant="body2">Отправлять в Telegram</Typography>}
                    />
                    <TextField
                        label="Chat ID"
                        {...form.register("chatId")}
                        disabled={busy}
                        error={!!form.formState.errors.chatId}
                        helperText={form.formState.errors.chatId?.message ?? "Числовой ID чата или @имя канала"}
                    />
                    <TextField
                        label={settings?.hasToken ? "Новый токен бота" : "Токен бота"}
                        type="password"
                        autoComplete="off"
                        {...form.register("token")}
                        disabled={busy}
                        error={!!form.formState.errors.token}
                        helperText={
                            form.formState.errors.token?.message ??
                            (settings?.hasToken
                                ? "Токен уже сохранён. Оставь поле пустым, чтобы его не менять."
                                : "Создай бота через @BotFather и начни с ним диалог.")
                        }
                    />
                    {error && <Alert severity="error">{error}</Alert>}
                    {saved && <Alert severity="success">Настройки сохранены</Alert>}
                    <Button
                        variant="contained"
                        type="submit"
                        disabled={busy || !form.formState.isDirty || !form.formState.isValid}
                        sx={{ alignSelf: "start" }}
                    >
                        {form.formState.isSubmitting ? "Сохраняем…" : "Сохранить"}
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                        Старые события при первом подключении не рассылаются. Проекты и отслеживание MR/PR выбираются в{" "}
                        <MuiLink component={Link} to="/settings/connections">
                            подключениях
                        </MuiLink>
                        .
                    </Typography>
                </Stack>
            </Box>
        </Stack>
    );
}
