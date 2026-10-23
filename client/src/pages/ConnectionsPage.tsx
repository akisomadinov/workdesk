import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    MenuItem,
    Stack,
    Switch,
    TextField,
    Typography
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import SyncRounded from "@mui/icons-material/SyncRounded";
import LockOutlined from "@mui/icons-material/LockOutlined";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    useConnectionsCreateMutation,
    useConnectionsEnableMutation,
    useConnectionsGetQuery,
    useConnectionsSyncMutation,
    useConnectionsTokenMutation,
    useConnectionsScopeMutation
} from "@/api/autogen/workdesk";
import type { ConnectionResponseRead as ConnectionResponse } from "@/api/autogen/workdesk";
import { connectionSchema } from "./validation";
import type { ConnectionValues } from "./validation";
import { dateTime, message } from "@/common/models";

function ConnectionCard({ connection }: { connection: ConnectionResponse }) {
    const [sync, { isLoading }] = useConnectionsSyncMutation();
    const [enable] = useConnectionsEnableMutation();
    const [saveToken, tokenState] = useConnectionsTokenMutation();
    const [saveScope] = useConnectionsScopeMutation();
    const scopeForm = useForm({
        defaultValues: {
            projects: connection.projects ?? "",
            watchMergeRequests: connection.watchMergeRequests ?? false
        }
    });
    const [scopeOpen, setScopeOpen] = useState(false);
    const [tokenOpen, setTokenOpen] = useState(false);
    const [token, setToken] = useState("");
    const [error, setError] = useState("");
    const healthLabels: Record<string, string> = {
        never: "Не синхронизировано",
        ok: "На связи",
        offline: "Нет соединения",
        auth: "Нужен токен",
        limited: "Лимит API",
        forbidden: "Нет доступа",
        error: "Ошибка ответа"
    };
    return (
        <Card variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Stack gap={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Stack direction="row" gap={1.5} alignItems="center" sx={{ minWidth: 0, maxWidth: "100%" }}>
                        <Box
                            sx={{
                                bgcolor: "background.default",
                                px: 1.5,
                                py: 1,
                                borderRadius: 2,
                                fontWeight: 750,
                                fontSize: 12
                            }}
                        >
                            {connection.provider === "gitlab" ? "GL" : "GH"}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="h6" sx={{ overflowWrap: "anywhere" }}>
                                {connection.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                                {connection.apiUrl}
                            </Typography>
                        </Box>
                    </Stack>
                    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                        {connection.requiresVpn && <Chip icon={<LockOutlined />} label="Через VPN" size="small" />}
                        <Chip
                            label={
                                !connection.enabled
                                    ? "На паузе"
                                    : (healthLabels[connection.health ?? "never"] ?? "Неизвестно")
                            }
                            color={connection.enabled && connection.health === "ok" ? "success" : "default"}
                            variant="outlined"
                        />
                    </Stack>
                </Stack>
                {error && <Alert severity="error">{error}</Alert>}
                {connection.message && (
                    <Typography variant="body2" color="text.secondary">
                        {connection.message}
                    </Typography>
                )}
                <Divider />
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    gap={2}
                    alignItems={{ md: "center" }}
                    justifyContent="space-between"
                >
                    <Typography variant="caption" color="text.secondary">
                        Успешная загрузка: {dateTime(connection.lastSuccess)}
                        <br />
                        Последняя попытка: {dateTime(connection.lastAttempt)}
                    </Typography>
                    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                        <FormControlLabel
                            control={
                                <Switch
                                    size="small"
                                    checked={connection.enabled ?? true}
                                    onChange={async (_, enabled) => {
                                        try {
                                            await enable({
                                                id: connection.id ?? "",
                                                setEnabledRequest: { enabled }
                                            }).unwrap();
                                            setError("");
                                        } catch (failure) {
                                            setError(message(failure));
                                        }
                                    }}
                                />
                            }
                            label={<Typography variant="caption">Включено</Typography>}
                        />
                        <Button size="small" color="inherit" onClick={() => setTokenOpen(true)}>
                            {connection.hasToken ? "Обновить токен" : "Добавить токен"}
                        </Button>
                        <Button
                            size="small"
                            onClick={() => {
                                scopeForm.reset({
                                    projects: connection.projects ?? "",
                                    watchMergeRequests: connection.watchMergeRequests ?? false
                                });
                                setScopeOpen(true);
                            }}
                        >
                            Проекты и события
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<SyncRounded />}
                            disabled={isLoading || !connection.enabled || !connection.hasToken}
                            onClick={async () => {
                                setError("");
                                try {
                                    await sync({ id: connection.id ?? "" }).unwrap();
                                } catch (failure) {
                                    setError(message(failure));
                                }
                            }}
                        >
                            {isLoading ? "Загружаем…" : "Синхронизировать"}
                        </Button>
                    </Stack>
                </Stack>
            </Stack>
            <Dialog open={scopeOpen} onClose={() => setScopeOpen(false)}>
                <form
                    onSubmit={scopeForm.handleSubmit(async (values) => {
                        try {
                            await saveScope({ id: connection.id ?? "", setScopeRequest: values }).unwrap();
                            setScopeOpen(false);
                            setError("");
                        } catch (problem) {
                            setError(message(problem));
                        }
                    })}
                >
                    <DialogTitle>Проекты и уведомления</DialogTitle>
                    <DialogContent>
                        <Stack gap={2} sx={{ pt: 1 }}>
                            <TextField
                                label="Разрешённые проекты, по одному в строке"
                                multiline
                                minRows={5}
                                {...scopeForm.register("projects")}
                                helperText={
                                    connection.provider === "gitlab"
                                        ? "ID проекта или group/project. Пусто: все доступные назначенные задачи."
                                        : "owner/repository. Пусто: все доступные назначенные задачи."
                                }
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        {...scopeForm.register("watchMergeRequests")}
                                        checked={scopeForm.watch("watchMergeRequests")}
                                    />
                                }
                                label="Уведомлять о комментариях в моих MR/PR"
                            />
                            <Typography variant="caption" color="text.secondary">
                                Для комментариев нужен явный список проектов. После изменения списка выполняется новая
                                исходная загрузка без рассылки старых задач.
                            </Typography>
                            {error && <Alert severity="error">{error}</Alert>}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setScopeOpen(false)}>Отмена</Button>
                        <Button type="submit" variant="contained" disabled={scopeForm.formState.isSubmitting}>
                            Сохранить
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
            <Dialog
                open={tokenOpen}
                onClose={() => {
                    if (!tokenState.isLoading) {
                        setTokenOpen(false);
                        setToken("");
                    }
                }}
            >
                <DialogTitle>Токен · {connection.name}</DialogTitle>
                <DialogContent>
                    <Stack gap={2} sx={{ pt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Токен хранится в связке ключей macOS. Он не попадает в базу задач и экспорт.
                        </Typography>
                        <TextField
                            label="Токен доступа"
                            type="password"
                            autoComplete="off"
                            value={token}
                            onChange={(event) => setToken(event.target.value)}
                        />
                        {tokenState.isError && <Alert severity="error">{message(tokenState.error)}</Alert>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button
                        disabled={tokenState.isLoading}
                        onClick={() => {
                            setTokenOpen(false);
                            setToken("");
                        }}
                    >
                        Отмена
                    </Button>
                    <Button
                        variant="contained"
                        disabled={!token.trim() || tokenState.isLoading}
                        onClick={async () => {
                            try {
                                await saveToken({ id: connection.id ?? "", setTokenRequest: { token } }).unwrap();
                                setToken("");
                                setTokenOpen(false);
                            } catch {
                                /* Shown by mutation error state. */
                            }
                        }}
                    >
                        Сохранить токен
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    );
}
export default function ConnectionsPage() {
    const { data: connections = [], error: queryError } = useConnectionsGetQuery(undefined, { pollingInterval: 10000 });
    const [open, setOpen] = useState(false);
    const [create, { isLoading, error }] = useConnectionsCreateMutation();
    const form = useForm<ConnectionValues>({
        resolver: zodResolver(connectionSchema),
        mode: "onChange",
        defaultValues: {
            name: "",
            provider: "gitlab",
            apiUrl: "",
            requiresVpn: false,
            token: "",
            projects: "",
            watchMergeRequests: false
        }
    });
    async function submit(values: ConnectionValues) {
        try {
            await create({ createConnectionRequest: values }).unwrap();
            form.reset();
            setOpen(false);
        } catch {
            /* Mutation error is shown inline. */
        }
    }
    return (
        <Stack gap={3}>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                gap={2}
                alignItems={{ xs: "start", sm: "center" }}
            >
                <Box>
                    <Typography variant="h5">Подключения</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Каждый сервер синхронизируется независимо.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddRounded />}
                    onClick={() => setOpen(true)}
                    sx={{ flexShrink: 0 }}
                >
                    Добавить сервер
                </Button>
            </Stack>
            <Typography variant="body2" color="text.secondary">
                Импортируем назначенные тебе задачи. Личная доска и заметки не отправляются в GitLab/GitHub. Проверяем
                обновления каждые 5 минут, пока Workdesk запущен.
            </Typography>
            {queryError && <Alert severity="error">{message(queryError)}</Alert>}
            {connections.length === 0 && (
                <Box
                    sx={{
                        textAlign: "center",
                        py: 4,
                        px: 3,
                        bgcolor: "background.paper",
                        borderRadius: 3,
                        border: 1,
                        borderColor: "divider"
                    }}
                >
                    <LockOutlined sx={{ color: "primary.main", fontSize: 36, mb: 2 }} />
                    <Typography variant="h6">Рабочие задачи в одном месте</Typography>
                    <Typography color="text.secondary" variant="body2" sx={{ maxWidth: 450, mx: "auto", mt: 1 }}>
                        Подключи корпоративный GitLab или GitHub. Для внутреннего сервера включи свой VPN, затем запусти
                        синхронизацию.
                    </Typography>
                    <Button sx={{ mt: 2 }} onClick={() => setOpen(true)}>
                        Настроить первое подключение
                    </Button>
                </Box>
            )}
            {connections.map((connection) => (
                <ConnectionCard key={connection.id} connection={connection} />
            ))}
            <Dialog
                open={open}
                onClose={
                    isLoading
                        ? undefined
                        : () => {
                              setOpen(false);
                              form.reset();
                          }
                }
            >
                <form onSubmit={form.handleSubmit(submit)}>
                    <DialogTitle>Новое подключение</DialogTitle>
                    <DialogContent>
                        <Stack gap={2} sx={{ pt: 1 }}>
                            <TextField
                                label="Название"
                                placeholder="Например: работа · внутренний GitLab"
                                {...form.register("name")}
                                error={!!form.formState.errors.name}
                                helperText={form.formState.errors.name?.message}
                            />
                            <TextField select label="Сервис" defaultValue="gitlab" {...form.register("provider")}>
                                <MenuItem value="gitlab">GitLab</MenuItem>
                                <MenuItem value="github">GitHub / GitHub Enterprise</MenuItem>
                            </TextField>
                            <TextField
                                label="Адрес API"
                                placeholder="https://gitlab.company.ru/api/v4/"
                                {...form.register("apiUrl")}
                                error={!!form.formState.errors.apiUrl}
                                helperText={
                                    form.formState.errors.apiUrl?.message ??
                                    "GitLab: /api/v4/ · GitHub Enterprise: /api/v3/ · GitHub.com: https://api.github.com/"
                                }
                            />
                            <FormControlLabel
                                control={<Switch {...form.register("requiresVpn")} />}
                                label="Для доступа нужен VPN"
                            />
                            <TextField
                                label="Разрешённые проекты (необязательно)"
                                multiline
                                minRows={2}
                                {...form.register("projects")}
                                helperText="GitLab: ID или group/project. GitHub: owner/repository. По одному в строке."
                            />
                            <TextField
                                label="Токен доступа (можно добавить позже)"
                                type="password"
                                autoComplete="off"
                                {...form.register("token")}
                            />
                            <Typography variant="caption" color="text.secondary">
                                GitLab: токен с read_api. GitHub: токен с доступом к нужным репозиториям и чтению
                                Issues. VPN подключается средствами твоего компьютера.
                            </Typography>
                            {error && <Alert severity="error">{message(error)}</Alert>}
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 3 }}>
                        <Button onClick={() => setOpen(false)} disabled={isLoading}>
                            Отмена
                        </Button>
                        <Button variant="contained" type="submit" disabled={isLoading}>
                            Добавить подключение
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Stack>
    );
}
