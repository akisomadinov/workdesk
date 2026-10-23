import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Divider,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Snackbar,
    Stack,
    Typography
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import PersonAddOutlined from "@mui/icons-material/PersonAddOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import { Link } from "react-router-dom";
import {
    useAuthSessionQuery,
    useTeamGetQuery,
    useTeamPendingQuery,
    useTeamAcceptMutation
} from "@/api/autogen/workdesk";
import AccountPage from "./AccountPage";
import InviteDialog from "./team/InviteDialog";
import CreateTeamDialog from "./team/CreateTeamDialog";
import TeamMembers from "./team/TeamMembers";
import { roleLabel } from "./team/roles";
import { dateTime, message } from "@/common/models";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import useSwitchWorkspace from "@/hooks/useSwitchWorkspace";
export default function TeamPage() {
    const { data: pending = [], error: pendingError } = useTeamPendingQuery(undefined, { pollingInterval: 15000 });
    const { data: session } = useAuthSessionQuery();
    const {
        data: spaces = [],
        isLoading,
        error: loadError,
        refetch
    } = useTeamGetQuery(undefined, { pollingInterval: 15000 });
    const [accept, { isLoading: accepting }] = useTeamAcceptMutation();
    const { scope } = useWorkspaceStore();
    const switchWorkspace = useSwitchWorkspace();
    const space = spaces.find((item) => item.id === scope);
    const [createOpen, setCreateOpen] = useState(false);
    const [inviteId, setInviteId] = useState<string | null>(null);
    const [setupOpen, setSetupOpen] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    if (session?.setupRequired && setupOpen)
        return (
            <Box>
                <Button color="inherit" startIcon={<ArrowBackRounded />} onClick={() => setSetupOpen(false)}>
                    Назад
                </Button>
                <AccountPage mode="setup" />
            </Box>
        );
    return (
        <Stack gap={3} sx={{ maxWidth: 880 }}>
            {space && (
                <Button
                    color="inherit"
                    startIcon={<ArrowBackRounded />}
                    onClick={() => switchWorkspace("mine")}
                    sx={{ alignSelf: "start", px: 0 }}
                >
                    Все команды
                </Button>
            )}
            <Stack
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "start", sm: "center" }}
                justifyContent="space-between"
                gap={2}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h4" component="h1" sx={{ overflowWrap: "anywhere" }}>
                        {space?.name ?? "Команда"}
                    </Typography>
                    {space ? (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                            Твои права: {roleLabel(space.role)}
                        </Typography>
                    ) : (
                        !session?.setupRequired && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                                Выбери команду для общей доски и документов.
                            </Typography>
                        )
                    )}
                </Box>
                {space?.role === "owner" ? (
                    <Button
                        variant="contained"
                        startIcon={<PersonAddOutlined />}
                        sx={{ flexShrink: 0 }}
                        onClick={() => setInviteId(space.id ?? null)}
                    >
                        Пригласить
                    </Button>
                ) : !space && !session?.setupRequired && !!spaces.length ? (
                    <Button
                        variant="contained"
                        startIcon={<AddRounded />}
                        sx={{ flexShrink: 0 }}
                        onClick={() => setCreateOpen(true)}
                    >
                        Создать команду
                    </Button>
                ) : null}
            </Stack>
            {(error || loadError || pendingError) && (
                <Alert severity="error" onClose={() => setError("")}>
                    {error || message(loadError || pendingError)}
                </Alert>
            )}
            {!!pending.length && (
                <Box>
                    <Typography variant="body2" fontWeight={650}>
                        Приглашения · {pending.length}
                    </Typography>
                    {pending.map((invitation) => (
                        <Stack
                            key={invitation.id}
                            direction={{ xs: "column", sm: "row" }}
                            alignItems={{ xs: "start", sm: "center" }}
                            gap={1.5}
                            sx={{ py: 1.5, borderBottom: 1, borderColor: "divider" }}
                        >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: "anywhere" }}>
                                    {invitation.workspace}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {roleLabel(invitation.role)} · до {dateTime(invitation.expires)}
                                </Typography>
                            </Box>
                            <Button
                                variant="outlined"
                                disabled={accepting}
                                onClick={async () => {
                                    setError("");
                                    try {
                                        const known = new Set(spaces.map((item) => item.id));
                                        await accept({ id: invitation.id ?? "" }).unwrap();
                                        const result = await refetch().unwrap();
                                        const added = result.filter((item) => item.id && !known.has(item.id));
                                        if (added.length === 1 && added[0].id) switchWorkspace(added[0].id);
                                        setNotice("Приглашение принято");
                                    } catch (failure) {
                                        setError(message(failure));
                                    }
                                }}
                            >
                                Присоединиться
                            </Button>
                        </Stack>
                    ))}
                </Box>
            )}
            {session?.setupRequired ? (
                <Stack gap={2} sx={{ maxWidth: 480, py: 3 }}>
                    <GroupsOutlined sx={{ fontSize: 36, color: "text.disabled" }} />
                    <Typography variant="h5" component="h2">
                        Сначала создай аккаунт
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        С аккаунтом можно создавать команды и приглашать коллег. Личные задачи и документы сохранятся.
                    </Typography>
                    <Button variant="contained" onClick={() => setSetupOpen(true)} sx={{ alignSelf: "start" }}>
                        Создать аккаунт
                    </Button>
                </Stack>
            ) : isLoading ? (
                <Typography role="status">Загружаем команды…</Typography>
            ) : space ? (
                <>
                    <Button
                        component={Link}
                        to="/board"
                        endIcon={<ArrowForwardRounded />}
                        color="inherit"
                        sx={{ alignSelf: "start", px: 0 }}
                    >
                        Открыть доску команды
                    </Button>
                    <Divider />
                    <TeamMembers key={space.id} space={space} userId={session?.userId} />
                </>
            ) : spaces.length ? (
                <List disablePadding aria-label="Мои команды">
                    {spaces.map((item) => (
                        <Box component="li" key={item.id}>
                            <ListItemButton
                                onClick={() => switchWorkspace(item.id ?? "mine")}
                                sx={{ borderBottom: 1, borderColor: "divider", px: 0, py: 2, gap: 1.5 }}
                            >
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                    <GroupsOutlined />
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.name}
                                    secondary={`${roleLabel(item.role)} · Участников: ${item.members?.length ?? 0}`}
                                    primaryTypographyProps={{
                                        fontWeight: 600,
                                        fontSize: 14,
                                        sx: { overflowWrap: "anywhere" }
                                    }}
                                    secondaryTypographyProps={{ fontSize: 12, mt: 0.5 }}
                                />
                                <ChevronRightRounded fontSize="small" color="action" />
                            </ListItemButton>
                        </Box>
                    ))}
                </List>
            ) : (
                !loadError && (
                    <Stack gap={2} sx={{ maxWidth: 480, py: 3 }}>
                        <GroupsOutlined sx={{ fontSize: 36, color: "text.disabled" }} />
                        <Typography variant="h5" component="h2">
                            У тебя пока нет команд
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Создай команду или прими приглашение коллеги. Общие материалы будут в пространстве команды,
                            личные останутся у тебя.
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddRounded />}
                            onClick={() => setCreateOpen(true)}
                            sx={{ alignSelf: "start" }}
                        >
                            Создать команду
                        </Button>
                    </Stack>
                )
            )}
            {createOpen && <CreateTeamDialog onClose={() => setCreateOpen(false)} />}
            {inviteId === space?.id && space?.id && (
                <InviteDialog
                    key={space.id}
                    workspaceId={space.id}
                    workspaceName={space.name ?? "Команда"}
                    onClose={() => setInviteId(null)}
                />
            )}
            <Snackbar open={!!notice} message={notice} autoHideDuration={4000} onClose={() => setNotice("")} />
        </Stack>
    );
}
