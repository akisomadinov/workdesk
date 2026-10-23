import { useState } from "react";
import {
    Alert,
    Avatar,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    MenuItem,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import PersonAddOutlined from "@mui/icons-material/PersonAddOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import {
    useAuthSessionQuery,
    useTeamGetQuery,
    useTeamCreateMutation,
    useTeamRoleMutation,
    useTeamPendingQuery,
    useTeamAcceptMutation
} from "@/api/autogen/workdesk";
import AccountPage from "./AccountPage";
import InviteDialog from "./team/InviteDialog";
import { message } from "@/common/models";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
const schema = z.object({ name: z.string().trim().min(1, "Укажи название команды").max(200, "До 200 символов") });
const roles: Record<string, string> = { owner: "Владелец", editor: "Редактор", reader: "Читатель" };
export default function TeamPage() {
    const { data: pending = [] } = useTeamPendingQuery(undefined, { pollingInterval: 15000 });
    const [accept, { isLoading: accepting }] = useTeamAcceptMutation();
    const { data: session } = useAuthSessionQuery();
    const { data: spaces = [], isLoading, error: loadError } = useTeamGetQuery(undefined, { pollingInterval: 15000 });
    const [create] = useTeamCreateMutation();
    const [changeRole, { isLoading: changingRole }] = useTeamRoleMutation();
    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        mode: "onChange",
        defaultValues: { name: "" }
    });
    const { scope, setScope } = useWorkspaceStore();
    const [selectedId, setSelectedId] = useState(scope);
    const space = spaces.find((space) => space.id === selectedId) ?? spaces[0];
    const [createOpen, setCreateOpen] = useState(false);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [error, setError] = useState("");
    const [remove, setRemove] = useState<{ id: string; name: string } | null>(null);
    const navigate = useNavigate();
    async function updateRole(user: string, role: string) {
        try {
            await changeRole({ id: space?.id ?? "", user, roleRequest: { role } }).unwrap();
            setError("");
            setRemove(null);
        } catch (failure) {
            setError(message(failure));
        }
    }
    if (session?.setupRequired) return <AccountPage mode="setup" />;
    return (
        <Stack gap={3} sx={{ maxWidth: 1000 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                <Box>
                    <Typography variant="h4">Команда</Typography>
                    <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                        Участники, общие задачи и документы.
                    </Typography>
                </Box>
                {!!spaces.length && (
                    <Button color="inherit" startIcon={<AddRounded />} onClick={() => setCreateOpen(true)}>
                        Новая команда
                    </Button>
                )}
            </Stack>
            {(error || loadError) && (
                <Alert severity="error" onClose={() => setError("")}>
                    {error || message(loadError)}
                </Alert>
            )}
            {pending.map((invitation) => (
                <Alert
                    key={invitation.id}
                    severity="info"
                    action={
                        <Button
                            disabled={accepting}
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
                    Тебя пригласили в «{invitation.workspace}» · {roles[invitation.role ?? "reader"]}
                </Alert>
            ))}
            {isLoading ? (
                <Typography role="status">Загружаем команды…</Typography>
            ) : !space ? (
                <Stack
                    alignItems="center"
                    gap={2}
                    sx={{ py: 8, textAlign: "center", maxWidth: 460, alignSelf: "center" }}
                >
                    <GroupsOutlined sx={{ fontSize: 44, color: "text.disabled" }} />
                    <Typography variant="h5">Работать вместе проще</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Создай команду и пригласи коллег. У вас появится общая доска и место для документации. Личные
                        материалы останутся у тебя.
                    </Typography>
                    <Button variant="contained" startIcon={<AddRounded />} onClick={() => setCreateOpen(true)}>
                        Создать команду
                    </Button>
                </Stack>
            ) : (
                <>
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        gap={2}
                        alignItems={{ sm: "center" }}
                        justifyContent="space-between"
                    >
                        {spaces.length > 1 ? (
                            <TextField
                                select
                                label="Команда"
                                value={space.id}
                                onChange={(event) => setSelectedId(event.target.value)}
                                sx={{ maxWidth: 360 }}
                            >
                                {spaces.map((item) => (
                                    <MenuItem key={item.id} value={item.id}>
                                        {item.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        ) : (
                            <Box>
                                <Typography variant="h5">{space.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {roles[space.role ?? "reader"]} · твой логин @{session?.login}
                                </Typography>
                            </Box>
                        )}
                        {space.role === "owner" && (
                            <Button
                                variant="contained"
                                startIcon={<PersonAddOutlined />}
                                onClick={() => setInviteOpen(true)}
                            >
                                Пригласить
                            </Button>
                        )}
                    </Stack>
                    <Stack direction="row" gap={1} flexWrap="wrap">
                        <Button
                            variant="outlined"
                            color="inherit"
                            onClick={() => {
                                setScope(space.id ?? "mine");
                                navigate("/board");
                            }}
                        >
                            Доска команды
                        </Button>
                        <Button
                            variant="outlined"
                            color="inherit"
                            onClick={() => {
                                setScope(space.id ?? "mine");
                                navigate("/notes");
                            }}
                        >
                            Документы команды
                        </Button>
                    </Stack>
                    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
                        <Stack
                            direction="row"
                            justifyContent="space-between"
                            sx={{ px: 2.5, py: 1.5, bgcolor: "background.default" }}
                        >
                            <Typography variant="body2" fontWeight={650}>
                                Участники · {space.members?.length ?? 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Доступ
                            </Typography>
                        </Stack>
                        {(space.members ?? []).map((person) => (
                            <Box key={person.id}>
                                <Divider />
                                <Stack direction="row" gap={1.5} alignItems="center" sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                                    <Avatar
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            fontSize: 13,
                                            bgcolor: "action.selected",
                                            color: "text.secondary"
                                        }}
                                    >
                                        {person.name?.slice(0, 1)}
                                    </Avatar>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: "anywhere" }}>
                                            {person.name}
                                            {person.id === session?.userId ? " (ты)" : ""}
                                        </Typography>
                                    </Box>
                                    {space.role === "owner" && person.role !== "owner" ? (
                                        <TextField
                                            select
                                            value={person.role}
                                            disabled={changingRole}
                                            slotProps={{ htmlInput: { "aria-label": `Доступ: ${person.name}` } }}
                                            sx={{ width: 150, flexShrink: 0 }}
                                            onChange={(event) => {
                                                if (event.target.value === "removed")
                                                    setRemove({ id: person.id ?? "", name: person.name ?? "участник" });
                                                else void updateRole(person.id ?? "", event.target.value);
                                            }}
                                        >
                                            <MenuItem value="reader">Читатель</MenuItem>
                                            <MenuItem value="editor">Редактор</MenuItem>
                                            <Divider />
                                            <MenuItem value="removed">Удалить из команды</MenuItem>
                                        </TextField>
                                    ) : (
                                        <Typography variant="caption" color="text.secondary">
                                            {roles[person.role ?? "reader"]}
                                        </Typography>
                                    )}
                                </Stack>
                            </Box>
                        ))}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                        Читатель просматривает материалы, редактор может их менять. Только владелец управляет
                        участниками.
                    </Typography>
                </>
            )}
            <Dialog open={createOpen} onClose={form.formState.isSubmitting ? undefined : () => setCreateOpen(false)}>
                <form
                    onSubmit={form.handleSubmit(async ({ name }) => {
                        try {
                            const created = await create({ createWorkspaceRequest: { name } }).unwrap();
                            setSelectedId(created.id ?? "");
                            setCreateOpen(false);
                            form.reset();
                            setError("");
                        } catch (failure) {
                            form.setError("root", { message: message(failure) });
                        }
                    })}
                >
                    <DialogTitle>Новая команда</DialogTitle>
                    <DialogContent>
                        <Stack gap={2} sx={{ pt: 1 }}>
                            <TextField
                                autoFocus
                                label="Название команды"
                                placeholder="Например, Разработка"
                                {...form.register("name")}
                                error={!!form.formState.errors.name}
                                helperText={form.formState.errors.name?.message}
                            />
                            <Typography variant="body2" color="text.secondary">
                                После создания сможешь пригласить коллег и выбрать, какие материалы сделать общими.
                            </Typography>
                            {form.formState.errors.root && (
                                <Alert severity="error">{form.formState.errors.root.message}</Alert>
                            )}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setCreateOpen(false)}>Отмена</Button>
                        <Button type="submit" variant="contained" disabled={form.formState.isSubmitting}>
                            Создать команду
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
            {inviteOpen && space?.id && (
                <InviteDialog
                    workspaceId={space.id}
                    workspaceName={space.name ?? "Команда"}
                    onClose={() => setInviteOpen(false)}
                />
            )}
            <Dialog open={!!remove} onClose={() => setRemove(null)}>
                <DialogTitle>Удалить участника?</DialogTitle>
                <DialogContent>
                    {remove?.name} потеряет доступ к задачам и документам команды «{space?.name}». Его личные материалы
                    сохранятся.
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRemove(null)}>Отмена</Button>
                    <Button
                        color="error"
                        disabled={changingRole}
                        onClick={() => remove && void updateRole(remove.id, "removed")}
                    >
                        Удалить из команды
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
