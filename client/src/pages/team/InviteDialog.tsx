import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Radio,
    RadioGroup,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography
} from "@mui/material";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTeamInviteMutation } from "@/api/autogen/workdesk";
import { dateTime, message } from "@/common/models";
const schema = z
    .object({ mode: z.enum(["login", "link"]), login: z.string().trim(), role: z.enum(["reader", "editor"]) })
    .refine((value) => value.mode !== "login" || value.login.length > 0, {
        message: "Укажи логин пользователя",
        path: ["login"]
    });
export default function InviteDialog({
    workspaceId,
    workspaceName,
    onClose
}: {
    workspaceId: string;
    workspaceName: string;
    onClose: () => void;
}) {
    const [invite] = useTeamInviteMutation();
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);
    const [result, setResult] = useState<{ url: string; expires: string } | null>(null);
    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        mode: "onChange",
        defaultValues: { mode: "login", login: "", role: "reader" }
    });
    const values = useWatch({ control: form.control });
    return (
        <Dialog open onClose={form.formState.isSubmitting ? undefined : onClose}>
            <form
                onSubmit={form.handleSubmit(async (value) => {
                    setError("");
                    try {
                        const invitation = await invite({
                            id: workspaceId,
                            inviteRequest: { role: value.role, login: value.mode === "login" ? value.login : undefined }
                        }).unwrap();
                        setResult({
                            url: invitation.token ? `${location.origin}/join#${invitation.token}` : "",
                            expires: invitation.expires ?? ""
                        });
                    } catch (failure) {
                        setError(message(failure));
                    }
                })}
            >
                <DialogTitle>Пригласить в «{workspaceName}»</DialogTitle>
                <DialogContent>
                    {result ? (
                        <Stack gap={2} sx={{ pt: 1 }}>
                            <Alert severity="success">
                                {result.url
                                    ? "Ссылка готова. Отправь её будущему участнику."
                                    : "Приглашение отправлено. Пользователь увидит его в разделе «Команда»."}
                            </Alert>
                            {!!result.url && (
                                <>
                                    <TextField
                                        label="Ссылка для приглашения"
                                        value={result.url}
                                        slotProps={{ input: { readOnly: true } }}
                                        onFocus={(event) => event.target.select()}
                                    />
                                    <Button
                                        variant="outlined"
                                        startIcon={<ContentCopyRounded />}
                                        onClick={async () => {
                                            try {
                                                await navigator.clipboard.writeText(result.url);
                                                setCopied(true);
                                            } catch {
                                                setError(
                                                    "Не удалось скопировать автоматически. Выдели ссылку и скопируй её вручную."
                                                );
                                            }
                                        }}
                                    >
                                        {copied ? "Ссылка скопирована" : "Скопировать ссылку"}
                                    </Button>
                                    <Typography variant="body2" color="text.secondary">
                                        Ссылка на одного участника, действует до {dateTime(result.expires)}. После
                                        регистрации человек сразу попадёт в команду.
                                    </Typography>
                                    {["127.0.0.1", "localhost", "[::1]"].includes(location.hostname) && (
                                        <Alert severity="info">
                                            Этот адрес работает только на твоём компьютере. Для приглашения с другого
                                            устройства открой Workdesk по адресу общего сервера и создай ссылку там.
                                        </Alert>
                                    )}
                                </>
                            )}
                        </Stack>
                    ) : (
                        <Stack gap={2.5}>
                            <Tabs
                                value={values.mode}
                                onChange={(_, value: "login" | "link") => {
                                    form.setValue("mode", value);
                                    setError("");
                                }}
                                variant="fullWidth"
                                aria-label="Способ приглашения"
                            >
                                <Tab value="login" label="По логину" />
                                <Tab value="link" label="По ссылке" />
                            </Tabs>
                            {values.mode === "login" ? (
                                <TextField
                                    autoFocus
                                    label="Логин в Workdesk"
                                    placeholder="Например, alex"
                                    {...form.register("login")}
                                    error={!!form.formState.errors.login}
                                    helperText={
                                        form.formState.errors.login?.message ??
                                        "Для человека, у которого уже есть аккаунт на этом сервере."
                                    }
                                />
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    Подойдёт и для нового участника: он откроет ссылку, создаст аккаунт и присоединится
                                    к команде.
                                </Typography>
                            )}
                            <Box>
                                <Typography variant="body2" fontWeight={650} sx={{ mb: 1 }}>
                                    Что сможет участник
                                </Typography>
                                <Controller
                                    name="role"
                                    control={form.control}
                                    render={({ field }) => (
                                        <RadioGroup {...field} aria-label="Права участника">
                                            <FormControlLabel
                                                value="reader"
                                                control={<Radio size="small" />}
                                                label={
                                                    <Box sx={{ py: 0.75 }}>
                                                        <Typography variant="body2" fontWeight={600}>
                                                            Просматривать
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Читать задачи и документы команды
                                                        </Typography>
                                                    </Box>
                                                }
                                            />
                                            <FormControlLabel
                                                value="editor"
                                                control={<Radio size="small" />}
                                                label={
                                                    <Box sx={{ py: 0.75 }}>
                                                        <Typography variant="body2" fontWeight={600}>
                                                            Редактировать
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Создавать и изменять задачи и документы команды
                                                        </Typography>
                                                    </Box>
                                                }
                                            />
                                        </RadioGroup>
                                    )}
                                />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                                Личные задачи и документы участнику недоступны.
                            </Typography>
                        </Stack>
                    )}
                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button color="inherit" onClick={onClose}>
                        {result ? "Готово" : "Отмена"}
                    </Button>
                    {!result && (
                        <Button variant="contained" type="submit" disabled={form.formState.isSubmitting}>
                            {values.mode === "login" ? "Отправить приглашение" : "Создать ссылку"}
                        </Button>
                    )}
                </DialogActions>
            </form>
        </Dialog>
    );
}
