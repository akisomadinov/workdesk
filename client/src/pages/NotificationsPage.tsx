import { Alert, Box, Button, Card, Chip, FormControlLabel, Stack, Switch, TextField, Typography } from "@mui/material";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    useNotificationsGetQuery,
    useNotificationsReadMutation,
    useNotificationsTelegramQuery,
    useNotificationsConfigureMutation
} from "@/api/autogen/workdesk";
import { dateTime, message, safeLink } from "@/common/models";
export default function NotificationsPage() {
    const { data: items = [], error } = useNotificationsGetQuery(undefined, { pollingInterval: 15000 });
    const { data: settings } = useNotificationsTelegramQuery();
    const [read] = useNotificationsReadMutation();
    const [configure] = useNotificationsConfigureMutation();
    const form = useForm({ defaultValues: { chatId: "", token: "", enabled: false } });
    const [notice, setNotice] = useState("");
    const [failure, setFailure] = useState("");
    useEffect(() => {
        if (settings) form.reset({ chatId: settings.chatId ?? "", token: "", enabled: settings.enabled ?? false });
    }, [settings, form]);
    const delivery: Record<string, string> = {
        off: "В приложении",
        pending: "В очереди Telegram",
        sending: "Отправляем",
        sent: "Отправлено",
        failed: "Ошибка доставки",
        uncertain: "Доставка неизвестна"
    };
    return (
        <Stack gap={3}>
            <Box>
                <Typography variant="h4">Уведомления</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Новые задачи, комментарии в MR/PR и приглашения.
                </Typography>
            </Box>
            <Card variant="outlined" sx={{ p: 3 }}>
                <form
                    onSubmit={form.handleSubmit(async (values) => {
                        setFailure("");
                        try {
                            await configure({
                                saveTelegramRequest: { ...values, token: values.token || null }
                            }).unwrap();
                            setNotice("Настройки сохранены. Новые события будут отправляться выбранным способом.");
                            form.setValue("token", "");
                        } catch (problem) {
                            setFailure(message(problem));
                        }
                    })}
                >
                    <Stack gap={2}>
                        <Typography variant="h6">Telegram</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Создай бота через BotFather, начни с ним диалог и укажи chat_id. Передаём заголовок события
                            и ссылку, без текста рабочих заметок.
                        </Typography>
                        <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                            <TextField label="Chat ID" {...form.register("chatId")} />
                            <TextField
                                label={settings?.hasToken ? "Новый токен (если меняешь)" : "Токен бота"}
                                type="password"
                                autoComplete="off"
                                {...form.register("token")}
                            />
                        </Stack>
                        <FormControlLabel
                            control={<Switch {...form.register("enabled")} checked={form.watch("enabled")} />}
                            label="Отправлять новые уведомления в Telegram"
                        />
                        {notice && <Alert severity="success">{notice}</Alert>}
                        {failure && <Alert severity="error">{failure}</Alert>}
                        <Button
                            variant="outlined"
                            type="submit"
                            disabled={form.formState.isSubmitting}
                            sx={{ alignSelf: "start" }}
                        >
                            Сохранить настройки
                        </Button>
                    </Stack>
                </form>
            </Card>
            <Alert severity="info">
                Первая загрузка задач проходит без рассылки старых событий. Комментарии отслеживаются для твоих MR/PR в
                явно выбранных проектах. При неопределённом результате отправки повтор не выполняется автоматически.
            </Alert>
            {error && <Alert severity="error">{message(error)}</Alert>}
            {items.length === 0 && (
                <Typography color="text.secondary">
                    Новые события появятся здесь после синхронизации подключений.
                </Typography>
            )}
            {items.map((item) => (
                <Card
                    key={item.id}
                    variant="outlined"
                    sx={{ p: 2.5, borderLeft: item.read ? 1 : 3, borderColor: item.read ? "divider" : "primary.main" }}
                >
                    <Stack gap={1.5}>
                        <Stack direction="row" justifyContent="space-between" gap={2} flexWrap="wrap">
                            <Typography variant="body2" fontWeight={item.read ? 400 : 650}>
                                {item.title}
                            </Typography>
                            <Chip size="small" label={delivery[item.delivery ?? "off"] ?? item.delivery} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                            {dateTime(item.created)}
                        </Typography>
                        <Stack direction="row" gap={1}>
                            {item.kind === "invite" ? (
                                <Button component={Link} to="/team">
                                    Открыть приглашения
                                </Button>
                            ) : (
                                safeLink(item.url) && (
                                    <Button
                                        component="a"
                                        href={safeLink(item.url)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Открыть в трекере
                                    </Button>
                                )
                            )}
                            {!item.read && (
                                <Button
                                    color="inherit"
                                    onClick={async () => {
                                        try {
                                            await read({ id: item.id ?? "" }).unwrap();
                                        } catch (problem) {
                                            setFailure(message(problem));
                                        }
                                    }}
                                >
                                    Прочитано
                                </Button>
                            )}
                        </Stack>
                    </Stack>
                </Card>
            ))}
        </Stack>
    );
}
