import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, FormControlLabel, Stack, Switch, Typography } from "@mui/material";
import {
    useTelegramLinkGetQuery,
    useTelegramLinkCreateMutation,
    useTelegramLinkDeleteMutation,
    useNotificationsTelegramQuery,
    useNotificationsConfigureMutation
} from "@/api/autogen/workdesk";
import { message } from "@/common/models";

export default function TelegramLinkCard() {
    const [link, setLink] = useState<{ url: string; expires: string } | null>(null);
    const [error, setError] = useState("");
    const [waiting, setWaiting] = useState(false);
    const { data: state } = useTelegramLinkGetQuery(undefined, {
        pollingInterval: waiting ? 3000 : 0,
        skipPollingIfUnfocused: true
    });
    const { data: settings, refetch } = useNotificationsTelegramQuery();
    useEffect(() => {
        setWaiting(!!state?.pendingUntil);
    }, [state?.pendingUntil]);
    useEffect(() => {
        if (state?.connected) {
            setLink(null);
            void refetch();
        }
    }, [state?.connected, refetch]);
    const [create, creating] = useTelegramLinkCreateMutation();
    const [disconnect, disconnecting] = useTelegramLinkDeleteMutation();
    const [configure, configuring] = useNotificationsConfigureMutation();
    const busy = creating.isLoading || disconnecting.isLoading || configuring.isLoading;
    async function connect() {
        setError("");
        try {
            const result = await create().unwrap();
            if (result.url && result.expiresAt) setLink({ url: result.url, expires: result.expiresAt });
        } catch (problem) {
            setError(message(problem));
        }
    }
    async function unlink() {
        setError("");
        try {
            await disconnect().unwrap();
            setLink(null);
        } catch (problem) {
            setError(message(problem));
        }
    }
    async function toggle(enabled: boolean) {
        setError("");
        try {
            await configure({ saveTelegramRequest: { chatId: settings?.chatId ?? "", enabled } }).unwrap();
        } catch (problem) {
            setError(message(problem));
        }
    }
    const active = !!link && new Date(link.expires).getTime() > Date.now();
    return (
        <Stack gap={2} sx={{ maxWidth: 620 }}>
            <Box>
                <Typography variant="h6">Telegram</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Уведомления о твоих задачах и комментариях придут в личный чат с ботом.
                </Typography>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
            {state?.connected ? (
                <>
                    <Alert severity="success">Telegram привязан к твоему аккаунту Workdesk.</Alert>
                    <FormControlLabel
                        label="Отправлять уведомления"
                        control={
                            <Switch
                                checked={!!settings?.enabled}
                                disabled={busy}
                                onChange={(_, enabled) => void toggle(enabled)}
                            />
                        }
                    />
                    <Button color="inherit" onClick={() => void unlink()} disabled={busy} sx={{ alignSelf: "start" }}>
                        Отключить Telegram
                    </Button>
                </>
            ) : active && link ? (
                <>
                    <Typography variant="body2">
                        Открой бота и нажми Start. Эта страница обновится после привязки.
                    </Typography>
                    <Button
                        component="a"
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="contained"
                        sx={{ alignSelf: "start" }}
                    >
                        Открыть бота
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                        Ссылка действует до{" "}
                        {new Date(link.expires).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}. Не
                        передавай её другим людям.
                    </Typography>
                    <Button color="inherit" onClick={() => void unlink()} disabled={busy} sx={{ alignSelf: "start" }}>
                        Отменить привязку
                    </Button>
                </>
            ) : (
                <>
                    <Button
                        variant="contained"
                        onClick={() => void connect()}
                        disabled={busy}
                        startIcon={creating.isLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                        sx={{ alignSelf: "start" }}
                    >
                        {creating.isLoading ? "Готовим ссылку…" : "Подключить Telegram"}
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                        Нажми Start в боте. ID чата и код вручную вводить не нужно.
                    </Typography>
                </>
            )}
        </Stack>
    );
}
