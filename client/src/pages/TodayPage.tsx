import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    Collapse,
    IconButton,
    LinearProgress,
    Menu,
    MenuItem,
    Paper,
    Stack,
    Typography
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import { Link } from "react-router-dom";
import useTaskWorkspace from "@/hooks/useTaskWorkspace";
import useLocalDay from "@/hooks/useLocalDay";
import { useUiStore } from "@/stores/useUiStore";
import { message } from "@/common/models";
import type { TaskItem } from "@/common/models";
import NewDocumentDialog from "@/common/NewDocumentDialog";
import DeleteMaterialDialog from "@/common/DeleteMaterialDialog";
import NewTaskDialog from "./NewTaskDialog";
import TaskDetails from "./tasks/TaskDetails";
import TodayTaskMenu from "./today/TodayTaskMenu";
import TodayTaskRow from "./today/TodayTaskRow";
import PlanTaskDialog from "./today/PlanTaskDialog";
import { buildToday, firstReason, isOverdue } from "./today/today";
export default function TodayPage() {
    const { tasks, scoped, update, isLoading, error, canCreate } = useTaskWorkspace();
    const { select } = useUiStore();
    const today = useLocalDay();
    const day = buildToday(scoped, today);
    const [create, setCreate] = useState(false);
    const [plan, setPlan] = useState(false);
    const [documentOpen, setDocumentOpen] = useState(false);
    const [doneOpen, setDoneOpen] = useState(false);
    const [menu, setMenu] = useState<HTMLElement | null>(null);
    const [remove, setRemove] = useState<TaskItem | null>(null);
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState<string[]>([]);
    async function change(task: TaskItem, changes: Partial<TaskItem>) {
        if (task.canEdit === false || busy.includes(task.id)) return;
        setBusy((value) => [...value, task.id]);
        setNotice("");
        try {
            await update(task, changes);
        } catch (failure) {
            setNotice(message(failure));
            throw failure;
        } finally {
            setBusy((value) => value.filter((id) => id !== task.id));
        }
    }
    function row(task: TaskItem) {
        return (
            <TodayTaskRow
                key={task.id}
                task={task}
                today={today}
                busy={busy.includes(task.id)}
                onOpen={() => select(task.id)}
                onChange={(changes) => {
                    void change(task, changes).catch(() => {});
                }}
                onDelete={() => setRemove(task)}
            />
        );
    }
    const first = day.first;
    const overdueCount = day.overdue.length + Number(!!first && isOverdue(first, today));
    return (
        <Stack gap={{ xs: 3, sm: 4 }} sx={{ width: "100%", maxWidth: 920, mx: "auto", minWidth: 0 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1.5}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h4">Сегодня</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {new Date(`${today}T12:00:00`).toLocaleDateString("ru-RU", {
                            weekday: "long",
                            day: "numeric",
                            month: "long"
                        })}
                    </Typography>
                </Box>
                <Stack direction="row" alignItems="center" gap={0.5}>
                    <Button
                        variant="contained"
                        startIcon={<AddRounded />}
                        disabled={!canCreate}
                        onClick={() => setCreate(true)}
                        sx={{ whiteSpace: "nowrap", px: { xs: 1.5, sm: 2 } }}
                    >
                        Задача
                    </Button>
                    <IconButton aria-label="Действия на сегодня" onClick={(event) => setMenu(event.currentTarget)}>
                        <MoreHorizRounded />
                    </IconButton>
                </Stack>
            </Stack>
            {(overdueCount > 0 || day.waiting.length > 0) && (
                <Stack component="nav" aria-label="Быстрый переход по плану" direction="row" gap={2} flexWrap="wrap">
                    {overdueCount > 0 && (
                        <Button
                            size="small"
                            color="warning"
                            href={first && isOverdue(first, today) ? "#today-first" : "#today-overdue"}
                            sx={{ p: 0 }}
                        >
                            Просрочено · {overdueCount}
                        </Button>
                    )}
                    {day.waiting.length > 0 && (
                        <Button size="small" color="inherit" href="#today-waiting" sx={{ p: 0 }}>
                            Жду ответ · {day.waiting.length}
                        </Button>
                    )}
                </Stack>
            )}
            <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
                <MenuItem
                    disabled={!canCreate}
                    onClick={() => {
                        setMenu(null);
                        setDocumentOpen(true);
                    }}
                >
                    Создать документ
                </MenuItem>
                <MenuItem component={Link} to="/board" onClick={() => setMenu(null)}>
                    Открыть доску
                </MenuItem>
                <MenuItem component={Link} to="/trash" onClick={() => setMenu(null)}>
                    Корзина
                </MenuItem>
            </Menu>
            {isLoading && <LinearProgress />}
            {(error || notice) && (
                <Alert severity="error" onClose={notice ? () => setNotice("") : undefined}>
                    {notice || message(error)}
                </Alert>
            )}
            {first && (
                <Paper
                    variant="outlined"
                    component="section"
                    aria-label="Сначала"
                    id="today-first"
                    sx={{
                        p: { xs: 2.5, sm: 3 },
                        borderRadius: 2,
                        borderColor: "divider",
                        borderTop: 3,
                        borderTopColor: "primary.main"
                    }}
                >
                    <Stack gap={2}>
                        <Stack direction="row" alignItems="flex-start" gap={1.5}>
                            <Stack sx={{ flex: 1, minWidth: 0 }} gap={0.25}>
                                <Typography variant="overline" color="primary.main" fontWeight={700}>
                                    Сначала
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color={isOverdue(first, today) ? "warning.main" : "text.secondary"}
                                >
                                    {firstReason(first, today)}
                                </Typography>
                            </Stack>
                            {first.canEdit !== false && (
                                <Box sx={{ flexShrink: 0 }}>
                                    <TodayTaskMenu
                                        task={first}
                                        today={today}
                                        busy={busy.includes(first.id)}
                                        onOpen={() => select(first.id)}
                                        onChange={(changes) => {
                                            void change(first, changes).catch(() => {});
                                        }}
                                        onDelete={() => setRemove(first)}
                                    />
                                </Box>
                            )}
                        </Stack>
                        <Box>
                            <Typography variant="h5" sx={{ lineHeight: 1.4, overflowWrap: "anywhere" }}>
                                {first.title}
                            </Typography>
                            {first.project && (
                                <Typography variant="caption" color="text.secondary">
                                    {first.project}
                                </Typography>
                            )}
                        </Box>
                        <Typography
                            sx={{
                                fontSize: 15,
                                lineHeight: 1.7,
                                whiteSpace: "pre-wrap",
                                overflowWrap: "anywhere",
                                display: "-webkit-box",
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden"
                            }}
                        >
                            {first.nextStep || "Открой задачу и запиши одно действие, с которого начнёшь."}
                        </Typography>
                        <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                            <Button
                                variant="contained"
                                endIcon={<ArrowForwardRounded />}
                                disabled={busy.includes(first.id)}
                                onClick={async () => {
                                    if (first.stage !== "doing" && first.canEdit !== false) {
                                        try {
                                            await change(first, { stage: "doing", plannedFor: today });
                                        } catch {
                                            return;
                                        }
                                    }
                                    select(first.id);
                                }}
                            >
                                {first.canEdit === false
                                    ? "Открыть задачу"
                                    : first.stage === "doing"
                                      ? "Продолжить"
                                      : "Начать"}
                            </Button>
                            <Button color="inherit" onClick={() => select(first.id)}>
                                Подробнее
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>
            )}
            {day.overdue.length > 0 && (
                <Box component="section" aria-label="Просрочено" id="today-overdue">
                    <Stack direction="row" gap={1} alignItems="center">
                        <Typography variant="h6">
                            {first && isOverdue(first, today) ? "Ещё просрочено" : "Просрочено"}
                        </Typography>
                        <Chip size="small" label={day.overdue.length} color="warning" variant="outlined" />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                        Дата плана прошла. Продолжи работу или выбери новый день.
                    </Typography>
                    {day.overdue.map(row)}
                </Box>
            )}
            {(day.planned.length > 0 || !first) && !isLoading && (
                <Box component="section" aria-label="План на сегодня">
                    <Stack direction="row" gap={1} alignItems="center" justifyContent="space-between">
                        <Typography variant="h6">{first ? "Дальше сегодня" : "План на сегодня"}</Typography>
                        <Button size="small" color="inherit" disabled={!canCreate} onClick={() => setPlan(true)}>
                            Выбрать задачу
                        </Button>
                    </Stack>
                    {day.planned.length ? (
                        day.planned.map(row)
                    ) : (
                        <Box sx={{ py: 3 }}>
                            <Typography variant="body2" color="text.secondary">
                                {!canCreate
                                    ? "В этом пространстве пока нет задач на сегодня. У тебя доступ для чтения."
                                    : day.waiting.length
                                      ? "Пока ждёшь ответы, можно выбрать другую задачу."
                                      : day.done.length
                                        ? "Запланированные задачи завершены."
                                        : "Выбери одну задачу с доски или создай новую."}
                            </Typography>
                        </Box>
                    )}
                </Box>
            )}
            {first && !day.planned.length && (
                <Button
                    color="inherit"
                    sx={{ alignSelf: "start" }}
                    disabled={!canCreate}
                    startIcon={<AddRounded />}
                    onClick={() => setPlan(true)}
                >
                    Добавить из доски
                </Button>
            )}
            {day.waiting.length > 0 && (
                <Box component="section" aria-label="Жду ответ" id="today-waiting">
                    <Stack direction="row" gap={1} alignItems="center">
                        <Typography variant="h6">Жду ответ</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {day.waiting.length}
                        </Typography>
                    </Stack>
                    {day.waiting.map(row)}
                </Box>
            )}
            {day.done.length > 0 && (
                <Box>
                    <Button
                        color="inherit"
                        endIcon={<ExpandMoreRounded sx={{ transform: doneOpen ? "rotate(180deg)" : "none" }} />}
                        aria-expanded={doneOpen}
                        onClick={() => setDoneOpen(!doneOpen)}
                        sx={{ px: 0 }}
                    >
                        Завершено в плане · {day.done.length}
                    </Button>
                    <Collapse in={doneOpen}>{day.done.map(row)}</Collapse>
                </Box>
            )}
            {create && <NewTaskDialog open today onClose={() => setCreate(false)} onCreated={select} />}
            {plan && (
                <PlanTaskDialog
                    tasks={scoped.filter(
                        (task) =>
                            !task.archived &&
                            task.canEdit !== false &&
                            task.stage !== "done" &&
                            task.stage !== "waiting" &&
                            task.plannedFor !== today
                    )}
                    onClose={() => setPlan(false)}
                    onPlan={async (task) => {
                        await change(task, {
                            plannedFor: today,
                            stage: task.stage === "inbox" ? "planned" : task.stage
                        });
                    }}
                />
            )}
            {documentOpen && <NewDocumentDialog onClose={() => setDocumentOpen(false)} />}
            {remove && (
                <DeleteMaterialDialog
                    kind="task"
                    item={remove}
                    onClose={() => setRemove(null)}
                    onDeleted={() => setRemove(null)}
                />
            )}
            <TaskDetails tasks={tasks} />
        </Stack>
    );
}
