import { useId, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography
} from "@mui/material";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTeamInviteMutation } from "@/api/autogen/workdesk";
import { dateTime, message } from "@/common/models";
import RoleOptions from "./RoleOptions";
import { roleLabel } from "./roles";
import { invitationSchema } from "./validation";
import type { InvitationValues } from "./validation";
interface Props {
    workspaceId: string;
    workspaceName: string;
    onClose: () => void;
}
export default function InviteDialog({ workspaceId, workspaceName, onClose }: Props) {
    const id = useId();
    const [invite] = useTeamInviteMutation();
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);
    const [result, setResult] = useState<{ url: string; expires: string; login: string; role: string } | null>(null);
    const form = useForm<InvitationValues>({
        resolver: zodResolver(invitationSchema),
        mode: "onChange",
        defaultValues: { mode: "link", login: "", role: "reader" }
    });
    const values = useWatch({ control: form.control });
    const busy = form.formState.isSubmitting;
    return (
        <Dialog
            open
            onClose={busy ? undefined : onClose}
            aria-labelledby={`${id}-title`}
            slotProps={{ paper: { sx: { mx: { xs: 2, sm: 4 }, width: "calc(100% - 32px)" } } }}
        >
            <DialogTitle id={`${id}-title`} sx={{ pb: 1 }}>
                Пригласить участника
                <Typography
                    component="span"
                    variant="body2"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.5, overflowWrap: "anywhere" }}
                >
                    {workspaceName}
                </Typography>
            </DialogTitle>
            <DialogContent>
                <form
                    id={id}
                    onSubmit={form.handleSubmit(async (value) => {
                        if (result) return;
                        setError("");
                        try {
                            const invitation = await invite({
                                id: workspaceId,
                                inviteRequest: {
                                    role: value.role,
                                    login: value.mode === "login" ? value.login : undefined
                                }
                            }).unwrap();
                            setResult({
                                url: invitation.token ? `${location.origin}/join#${invitation.token}` : "",
                                expires: invitation.expires ?? "",
                                login: value.login,
                                role: invitation.role ?? value.role
                            });
                        } catch (failure) {
                            setError(message(failure));
                        }
                    })}
                >
                    {result ? (
                        <Stack gap={2} sx={{ pt: 1 }}>
                            <Box role="status">
                                <Typography variant="h6">
                                    {result.url ? "Ссылка готова" : `Приглашение для @${result.login} отправлено`}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Права: {roleLabel(result.role)}.{" "}
                                    {result.url
                                        ? "Отправь ссылку будущему участнику."
                                        : "Оно появится у пользователя в разделе «Команда»."}
                                </Typography>
                            </Box>
                            {result.url && (
                                <>
                                    <TextField
                                        label="Ссылка для приглашения"
                                        value={result.url}
                                        slotProps={{ input: { readOnly: true } }}
                                        onFocus={(event) => event.target.select()}
                                    />
                                    <Button
                                        variant="contained"
                                        startIcon={<ContentCopyRounded />}
                                        onClick={async () => {
                                            try {
                                                await navigator.clipboard.writeText(result.url);
                                                setCopied(true);
                                                setError("");
                                            } catch {
                                                setError(
                                                    "Выдели ссылку и скопируй её вручную: браузер не разрешил копирование."
                                                );
                                            }
                                        }}
                                    >
                                        {copied ? "Скопировано" : "Копировать ссылку"}
                                    </Button>
                                    <Typography variant="caption" color="text.secondary">
                                        На одного человека, до {dateTime(result.expires)}. Можно войти или
                                        зарегистрироваться.
                                    </Typography>
                                    {["127.0.0.1", "localhost", "[::1]"].includes(location.hostname) && (
                                        <Alert severity="info">
                                            Для другого устройства создай ссылку, открыв Workdesk по адресу общего
                                            сервера. Текущий адрес доступен только на этом компьютере.
                                        </Alert>
                                    )}
                                </>
                            )}
                        </Stack>
                    ) : (
                        <Stack gap={2}>
                            <Tabs
                                value={values.mode}
                                onChange={(_, value: "login" | "link") => {
                                    form.setValue("mode", value, { shouldValidate: true });
                                    setError("");
                                }}
                                variant="fullWidth"
                                aria-label="Способ приглашения"
                            >
                                <Tab value="link" label="По ссылке" disabled={busy} />
                                <Tab value="login" label="По логину" disabled={busy} />
                            </Tabs>
                            {values.mode === "login" ? (
                                <TextField
                                    autoFocus
                                    label="Логин в Workdesk"
                                    placeholder="@alex"
                                    {...form.register("login")}
                                    disabled={busy}
                                    error={!!form.formState.errors.login}
                                    helperText={
                                        form.formState.errors.login?.message ?? "Аккаунт должен быть на этом сервере."
                                    }
                                />
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    Для нового или существующего аккаунта. Ссылка добавит человека в эту команду после
                                    входа.
                                </Typography>
                            )}
                            <Box>
                                <Typography variant="body2" fontWeight={650} sx={{ mb: 1 }}>
                                    Права в команде
                                </Typography>
                                <Controller
                                    name="role"
                                    control={form.control}
                                    render={({ field }) => (
                                        <RoleOptions value={field.value} onChange={field.onChange} disabled={busy} />
                                    )}
                                />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                                Личные материалы не видны участникам. Приглашать людей и менять права может только
                                владелец.
                            </Typography>
                        </Stack>
                    )}
                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}
                </form>
            </DialogContent>
            <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2, flexWrap: "wrap" }}>
                {result && (
                    <Button
                        color="inherit"
                        onClick={() => {
                            setResult(null);
                            setCopied(false);
                            setError("");
                            form.setValue("login", "");
                        }}
                    >
                        Ещё участник
                    </Button>
                )}
                <Button color="inherit" onClick={onClose} disabled={busy}>
                    {result ? "Готово" : "Отмена"}
                </Button>
                {!result && (
                    <Button
                        form={id}
                        variant="contained"
                        type="submit"
                        disabled={busy || (values.mode === "login" && !form.formState.isValid)}
                    >
                        {busy ? "Создаём…" : values.mode === "login" ? "Пригласить" : "Создать ссылку"}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
