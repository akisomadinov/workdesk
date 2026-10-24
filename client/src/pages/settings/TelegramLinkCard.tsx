import { useState } from "react";
import {
    Alert,
    Avatar,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControlLabel,
    Stack,
    Switch,
    Typography
} from "@mui/material";
import Telegram from "@mui/icons-material/Telegram";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import useTelegramLink from "@/hooks/useTelegramLink";
import type { TelegramIdentity } from "@/api/autogen/workdesk";

function Identity({ account }: { account: TelegramIdentity }) {
    return (
        <Stack
            direction="row"
            gap={1.5}
            alignItems="center"
            sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 2 }}
        >
            <Avatar sx={{ bgcolor: "action.selected", color: "text.secondary" }}>
                <Telegram />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={650} sx={{ overflowWrap: "anywhere" }}>
                    {account.displayName || "Telegram-аккаунт"}
                </Typography>
                {account.username && (
                    <Typography variant="body2" color="text.secondary">
                        @{account.username}
                    </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                    ID: {account.chatId}
                </Typography>
            </Box>
        </Stack>
    );
}

export default function TelegramLinkCard() {
    const model = useTelegramLink();
    const { state, settings, link, busy } = model;
    const [disconnectOpen, setDisconnectOpen] = useState(false);
    return (
        <Stack gap={2} sx={{ maxWidth: 620 }}>
            <Box>
                <Typography variant="h5">Telegram</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Получай новые задачи и комментарии к MR в личный чат с ботом.
                </Typography>
            </Box>
            {model.error && <Alert severity="error">{model.error}</Alert>}
            {state?.candidate ? (
                <Stack gap={2}>
                    <Typography variant="h6">Это твой Telegram?</Typography>
                    <Identity account={state.candidate} />
                    <Typography variant="body2" color="text.secondary">
                        Проверь аккаунт. Уведомления начнут приходить в этот чат только после подтверждения.
                    </Typography>
                    <Stack direction="row" gap={1} sx={{ flexWrap: "wrap" }}>
                        <Button variant="contained" disabled={busy} onClick={() => void model.approve()}>
                            Подтвердить этот аккаунт
                        </Button>
                        <Button color="inherit" disabled={busy} onClick={() => void model.cancelLink()}>
                            Это не я · отменить
                        </Button>
                    </Stack>
                </Stack>
            ) : state?.pendingUntil ? (
                <Stack gap={2}>
                    <Typography variant="body2" fontWeight={600}>
                        1. Открой бота и нажми Start
                    </Typography>
                    {link ? (
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
                    ) : (
                        <Button
                            variant="outlined"
                            disabled={busy}
                            onClick={() => void model.connect()}
                            sx={{ alignSelf: "start" }}
                        >
                            Создать новую ссылку
                        </Button>
                    )}
                    <Typography variant="body2" fontWeight={600}>
                        2. Вернись сюда и подтверди свой Telegram
                    </Typography>
                    <Typography variant="body2" color="text.secondary" role="status">
                        Ждём ответ от бота…
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        В ссылке уже есть одноразовый код. Не пересылай её другим людям. Она действует до{" "}
                        {new Date(state.pendingUntil).toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit"
                        })}
                        .
                    </Typography>
                    <Button
                        color="inherit"
                        disabled={busy}
                        onClick={() => void model.cancelLink()}
                        sx={{ alignSelf: "start" }}
                    >
                        Отменить
                    </Button>
                </Stack>
            ) : state?.connected && state.account ? (
                <>
                    <Stack direction="row" gap={0.75} alignItems="center">
                        <CheckCircleOutlineRounded color="success" sx={{ fontSize: 18 }} />
                        <Typography variant="body2" fontWeight={600}>
                            Подключённый аккаунт
                        </Typography>
                    </Stack>
                    <Identity account={state.account} />
                    <FormControlLabel
                        label="Отправлять уведомления"
                        control={
                            <Switch
                                checked={!!settings?.enabled}
                                disabled={busy}
                                onChange={(_, enabled) => void model.toggle(enabled)}
                            />
                        }
                    />
                    <Stack direction="row" gap={1}>
                        <Button color="inherit" disabled={busy} onClick={() => void model.connect()}>
                            {state.account.displayName || state.account.username
                                ? "Сменить аккаунт"
                                : "Подтвердить аккаунт заново"}
                        </Button>
                        <Button color="inherit" disabled={busy} onClick={() => setDisconnectOpen(true)}>
                            Отключить
                        </Button>
                    </Stack>
                </>
            ) : (
                <>
                    <Typography variant="body2" color="text.secondary">
                        Открой бота по личной ссылке, нажми Start и подтверди аккаунт здесь. Один запуск бота не
                        включает уведомления.
                    </Typography>
                    <Button
                        variant="contained"
                        disabled={busy}
                        onClick={() => void model.connect()}
                        sx={{ alignSelf: "start" }}
                    >
                        {model.creating ? "Готовим ссылку…" : "Подключить Telegram"}
                    </Button>
                </>
            )}
            <Dialog
                open={disconnectOpen}
                onClose={() => setDisconnectOpen(false)}
                aria-labelledby="disconnect-telegram-title"
            >
                <DialogTitle id="disconnect-telegram-title">Отключить Telegram?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Уведомления в Workdesk сохранятся. Отправка в этот чат прекратится.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDisconnectOpen(false)}>Отмена</Button>
                    <Button
                        disabled={busy}
                        onClick={async () => {
                            await model.unlink();
                            setDisconnectOpen(false);
                        }}
                    >
                        Отключить
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
