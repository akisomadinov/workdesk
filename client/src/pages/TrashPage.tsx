import { useState } from "react";
import { Alert, Box, Button, LinearProgress, Snackbar, Stack, Tab, Tabs, Typography } from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import { Link } from "react-router-dom";
import {
    useAuthSessionQuery,
    useNotesRestoreMutation,
    useNotesTrashQuery,
    useTasksRestoreMutation,
    useTasksTrashQuery
} from "@/api/autogen/workdesk";
import { dateTime, message } from "@/common/models";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
export default function TrashPage() {
    const tasks = useTasksTrashQuery(undefined, { pollingInterval: 15000 });
    const notes = useNotesTrashQuery(undefined, { pollingInterval: 15000 });
    const [restoreTask] = useTasksRestoreMutation();
    const [restoreNote] = useNotesRestoreMutation();
    const { scope } = useWorkspaceStore();
    const { data: session } = useAuthSessionQuery();
    const [tab, setTab] = useState<"task" | "note">("task");
    const [busy, setBusy] = useState<string[]>([]);
    const [error, setError] = useState("");
    const [restored, setRestored] = useState<{ url: string; title: string } | null>(null);
    const visibleTasks = (tasks.data ?? []).filter(
        (item) =>
            scope === "all" ||
            (scope === "mine" ? !item.workspaceId || item.assigneeId === session?.userId : item.workspaceId === scope)
    );
    const visibleNotes = (notes.data ?? []).filter(
        (item) => scope === "all" || (scope === "mine" ? !item.workspaceId : item.workspaceId === scope)
    );
    const items = [...(tab === "task" ? visibleTasks : visibleNotes)].sort((a, b) =>
        (b.deletedAt ?? "").localeCompare(a.deletedAt ?? "")
    );
    return (
        <Stack gap={3} sx={{ maxWidth: 920, width: "100%", mx: "auto", minWidth: 0 }}>
            <Box>
                <Button component={Link} to="/" color="inherit" startIcon={<ArrowBackRounded />} sx={{ mb: 1, px: 0 }}>
                    Сегодня
                </Button>
                <Typography variant="h4">Корзина</Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                    Удалённые задачи и документы выбранного пространства. Восстановить их может участник с правом
                    редактирования.
                </Typography>
            </Box>
            <Tabs
                value={tab}
                onChange={(_, value: "task" | "note") => setTab(value)}
                variant="scrollable"
                allowScrollButtonsMobile
                aria-label="Содержимое корзины"
            >
                <Tab value="task" label={`Задачи · ${visibleTasks.length}`} />
                <Tab value="note" label={`Документы · ${visibleNotes.length}`} />
            </Tabs>
            {(tasks.isLoading || notes.isLoading) && <LinearProgress />}
            {(error || tasks.error || notes.error) && (
                <Alert severity="error" onClose={error ? () => setError("") : undefined}>
                    {error || message(tasks.error || notes.error)}
                </Alert>
            )}
            <Box>
                {items.map((item) => (
                    <Stack
                        key={item.id}
                        direction={{ xs: "column", sm: "row" }}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        gap={1.5}
                        sx={{ py: 2, borderBottom: 1, borderColor: "divider" }}
                    >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography fontWeight={600} sx={{ overflowWrap: "anywhere" }}>
                                {item.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Удалено {dateTime(item.deletedAt)}
                                {item.archived ? " · Из архива" : ""}
                            </Typography>
                        </Box>
                        {item.canEdit && (
                            <Button
                                variant="outlined"
                                size="small"
                                disabled={busy.includes(item.id!)}
                                onClick={async () => {
                                    if (!item.id) return;
                                    const id = item.id;
                                    setBusy((value) => [...value, id]);
                                    setError("");
                                    try {
                                        await (
                                            tab === "task"
                                                ? restoreTask({ id, revision: item.revision })
                                                : restoreNote({ id, revision: item.revision })
                                        ).unwrap();
                                        setRestored({
                                            title: item.title ?? "Материал",
                                            url: tab === "task" ? `/board?task=${id}` : `/notes/${id}`
                                        });
                                    } catch (failure) {
                                        setError(message(failure));
                                    } finally {
                                        setBusy((value) => value.filter((valueId) => valueId !== id));
                                    }
                                }}
                            >
                                Восстановить
                            </Button>
                        )}
                    </Stack>
                ))}
                {!items.length && !tasks.isLoading && !notes.isLoading && (
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                        Здесь нет удалённых {tab === "task" ? "задач" : "документов"}.
                    </Typography>
                )}
            </Box>
            <Snackbar
                open={!!restored}
                autoHideDuration={8000}
                onClose={() => setRestored(null)}
                message={`Восстановлено: ${restored?.title ?? ""}`}
                action={
                    <Button
                        component={Link}
                        to={restored?.url ?? "/"}
                        color="inherit"
                        onClick={() => setRestored(null)}
                    >
                        Открыть
                    </Button>
                }
            />
        </Stack>
    );
}
