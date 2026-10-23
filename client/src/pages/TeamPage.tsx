import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import { useForm } from "react-hook-form";
import {
    useAuthSessionQuery,
    useTeamGetQuery,
    useTeamCreateMutation,
    useTeamInviteMutation,
    useTeamRoleMutation,
    useTeamPendingQuery,
    useTeamAcceptMutation
} from "@/api/autogen/workdesk";
import AccountPage from "./AccountPage";
import { dateTime, message } from "@/common/models";
function InvitePerson({ workspaceId }: { workspaceId: string }) {
    const form = useForm({ defaultValues: { login: "", role: "reader" } });
    const [invite] = useTeamInviteMutation();
    const [notice, setNotice] = useState("");
    return (
        <form
            onSubmit={form.handleSubmit(async (values) => {
                try {
                    await invite({ id: workspaceId, inviteRequest: values }).unwrap();
                    setNotice("Приглашение появилось в аккаунте пользователя.");
                    form.reset();
                } catch (failure) {
                    setNotice(message(failure));
                }
            })}
        >
            <Stack gap={1.5}>
                <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                    <TextField label="Логин пользователя" {...form.register("login", { required: true })} />
                    <TextField
                        select
                        label="Роль"
                        defaultValue="reader"
                        {...form.register("role")}
                        sx={{ minWidth: 160 }}
                    >
                        <MenuItem value="reader">Читатель</MenuItem>
                        <MenuItem value="editor">Редактор</MenuItem>
                    </TextField>
                    <Button type="submit" variant="outlined" disabled={form.formState.isSubmitting}>
                        Пригласить
                    </Button>
                </Stack>
                {notice && <Typography variant="body2">{notice}</Typography>}
            </Stack>
        </form>
    );
}
export default function TeamPage() {
    const { data: pending = [] } = useTeamPendingQuery(undefined, { pollingInterval: 15000 });
    const [accept] = useTeamAcceptMutation();
    const { data: session } = useAuthSessionQuery();
    const { data: spaces = [] } = useTeamGetQuery(undefined, { pollingInterval: 15000 });
    const [create] = useTeamCreateMutation();
    const [invite] = useTeamInviteMutation();
    const [role] = useTeamRoleMutation();
    const form = useForm({ defaultValues: { name: "" } });
    const [error, setError] = useState("");
    const [invitation, setInvitation] = useState<{ url: string; expires: string } | null>(null);
    if (session?.setupRequired) return <AccountPage mode="setup" />;
    const roles: Record<string, string> = { owner: "Владелец", editor: "Редактор", reader: "Читатель" };
    return (
        <Stack gap={3}>
            <Box>
                <Typography variant="h4">Команда</Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                    Личные материалы закрыты. В общих пространствах действуют роли участников.
                </Typography>
            </Box>
            {!session?.sharedMode && (
                <Alert severity="info">
                    Сейчас приложение доступно только на этом компьютере. Чтобы участники открывали его со своих
                    устройств, нужен общий сервер с HTTPS. Приглашения и права можно подготовить здесь.
                </Alert>
            )}
            {error && <Alert severity="error">{error}</Alert>}
            <Typography variant="body2" color="text.secondary">
                Твой логин: {session?.login}
            </Typography>
            {pending.map((invitation) => (
                <Alert
                    key={invitation.id}
                    severity="info"
                    action={
                        <Button
                            onClick={async () => {
                                try {
                                    await accept({ id: invitation.id ?? "" }).unwrap();
                                } catch (failure) {
                                    setError(message(failure));
                                }
                            }}
                        >
                            Принять
                        </Button>
                    }
                >
                    Приглашение в «{invitation.workspace}» · {roles[invitation.role ?? "reader"]}
                </Alert>
            ))}
            <form
                onSubmit={form.handleSubmit(async ({ name }) => {
                    try {
                        await create({ createWorkspaceRequest: { name } }).unwrap();
                        form.reset();
                        setError("");
                    } catch (failure) {
                        setError(message(failure));
                    }
                })}
            >
                <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                    <TextField
                        label="Название нового пространства"
                        {...form.register("name", { required: "Укажи название" })}
                        error={!!form.formState.errors.name}
                    />
                    <Button variant="contained" type="submit" sx={{ flexShrink: 0 }}>
                        Создать пространство
                    </Button>
                </Stack>
            </form>
            {spaces.map((space) => (
                <Card key={space.id} variant="outlined" sx={{ p: 3 }}>
                    <Stack gap={2}>
                        <Stack direction="row" justifyContent="space-between" gap={2} flexWrap="wrap">
                            <Typography variant="h6">{space.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {roles[space.role ?? "reader"]}
                            </Typography>
                        </Stack>
                        {(space.members ?? []).map((person) => (
                            <Stack direction="row" gap={2} alignItems="center" key={person.id}>
                                <Typography sx={{ flex: 1 }} variant="body2">
                                    {person.name}
                                </Typography>
                                {space.role === "owner" && person.role !== "owner" ? (
                                    <TextField
                                        select
                                        size="small"
                                        value={person.role}
                                        sx={{ maxWidth: 180 }}
                                        onChange={async (event) => {
                                            try {
                                                await role({
                                                    id: space.id ?? "",
                                                    user: person.id ?? "",
                                                    roleRequest: { role: event.target.value }
                                                }).unwrap();
                                            } catch (failure) {
                                                setError(message(failure));
                                            }
                                        }}
                                    >
                                        <MenuItem value="reader">Читатель</MenuItem>
                                        <MenuItem value="editor">Редактор</MenuItem>
                                        <MenuItem value="removed">Отозвать доступ</MenuItem>
                                    </TextField>
                                ) : (
                                    <Typography variant="caption">{roles[person.role ?? "reader"]}</Typography>
                                )}
                            </Stack>
                        ))}
                        {space.role === "owner" && <InvitePerson workspaceId={space.id ?? ""} />}
                        {space.role === "owner" && (
                            <Stack direction="row" gap={1} flexWrap="wrap">
                                {["reader", "editor"].map((permission) => (
                                    <Button
                                        key={permission}
                                        variant="outlined"
                                        onClick={async () => {
                                            try {
                                                const result = await invite({
                                                    id: space.id ?? "",
                                                    inviteRequest: { role: permission }
                                                }).unwrap();
                                                setInvitation({
                                                    url: `${location.origin}/join#${result.token}`,
                                                    expires: result.expires ?? ""
                                                });
                                            } catch (failure) {
                                                setError(message(failure));
                                            }
                                        }}
                                    >
                                        Пригласить: {roles[permission].toLocaleLowerCase()}
                                    </Button>
                                ))}
                            </Stack>
                        )}
                    </Stack>
                </Card>
            ))}
            <Dialog open={!!invitation} onClose={() => setInvitation(null)}>
                <DialogTitle>Одноразовое приглашение</DialogTitle>
                <DialogContent>
                    <Stack gap={2}>
                        <Typography variant="body2">
                            Действует до {dateTime(invitation?.expires)}. Передай ссылку только тому, кого приглашаешь.
                        </Typography>
                        <TextField
                            label="Ссылка"
                            value={invitation?.url ?? ""}
                            slotProps={{ input: { readOnly: true } }}
                            onFocus={(event) => event.target.select()}
                        />
                        {!session?.sharedMode && (
                            <Alert severity="info">
                                Адрес 127.0.0.1 откроется только на этом компьютере. После развёртывания используй адрес
                                общего сервера.
                            </Alert>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setInvitation(null)}>Готово</Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
