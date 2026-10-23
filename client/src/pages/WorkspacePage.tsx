import { useEffect, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    LinearProgress,
    MenuItem,
    Snackbar,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import WbSunnyOutlined from "@mui/icons-material/WbSunnyOutlined";
import SearchRounded from "@mui/icons-material/SearchRounded";
import ViewKanbanOutlined from "@mui/icons-material/ViewKanbanOutlined";
import { Link } from "react-router-dom";
import useTasks from "@/hooks/useTasks";
import { localDate, message, sourceLabel, stages, taskCount } from "@/common/models";
import type { TaskItem } from "@/common/models";
import { useUiStore } from "@/stores/useUiStore";
import TaskCard from "./TaskCard";
import TaskDrawer from "./TaskDrawer";
import NewTaskDialog from "./NewTaskDialog";
import { useSearchParams } from "react-router-dom";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useAuthSessionQuery, useTeamGetQuery } from "@/api/autogen/workdesk";

export default function WorkspacePage({ view }: { view: "today" | "board" | "inbox" | "archive" }) {
    const { tasks, connections, update, error, isLoading } = useTasks();
    const { scope } = useWorkspaceStore();
    const { data: session } = useAuthSessionQuery();
    const { data: spaces = [] } = useTeamGetQuery();
    const [params] = useSearchParams();
    const { query, source, selected, setQuery, setSource, select } = useUiStore();
    const [create, setCreate] = useState(false);
    const [notice, setNotice] = useState({ key: 0, text: "" });
    const [dragged, setDragged] = useState<string | null>(null);
    const [today, setToday] = useState(localDate());
    useEffect(() => {
        const id = params.get("task");
        if (id) select(id);
    }, [params, select]);
    useEffect(() => {
        const timer = setInterval(() => setToday(localDate()), 30000);
        return () => clearInterval(timer);
    }, []);
    const selectedTask = tasks.find((task) => task.id === selected);
    const scoped = tasks.filter(
        (task) =>
            scope === "all" ||
            (scope === "mine" ? !task.workspaceId || task.assigneeId === session?.userId : task.workspaceId === scope)
    );
    const active = scoped.filter((task) => !task.archived);
    const dayTasks = active.filter(
        (task) => task.plannedFor === today || (!!task.plannedFor && task.plannedFor < today && task.stage !== "done")
    );
    const base =
        view === "today"
            ? dayTasks
            : view === "inbox"
              ? active.filter((task) => task.stage === "inbox")
              : view === "archive"
                ? scoped.filter((task) => task.archived)
                : active;
    const filtered = base.filter(
        (task) =>
            (source === "all" || (source === "local" ? !task.connectionId : task.connectionId === source)) &&
            `${task.title} ${task.project} ${task.description} ${task.notes} ${task.nextStep}`
                .toLocaleLowerCase("ru-RU")
                .includes(query.toLocaleLowerCase("ru-RU"))
    );
    const rank: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
    filtered.sort((a, b) => (rank[a.priority] ?? 2) - (rank[b.priority] ?? 2));
    const titles = { today: "Сегодня", board: "Моя доска", inbox: "Входящие", archive: "Архив" };
    const captions = {
        today: "Выбери главное. Остальное уже сохранено на доске.",
        board: "Все проекты перед глазами. Перетаскивай карточки между колонками.",
        inbox: "Разбери новые задачи и выбери, что делать дальше.",
        archive: "Завершённые истории и заметки, которые можно вернуть."
    };
    async function change(task: TaskItem, value: Partial<TaskItem>) {
        if (task.canEdit === false) return;
        try {
            await update(task, value);
        } catch (failure) {
            setNotice({ key: Date.now(), text: message(failure) });
        }
    }
    function card(task: TaskItem) {
        return (
            <TaskCard
                key={task.id}
                task={task}
                source={sourceLabel(task.connectionId, connections)}
                onOpen={() => select(task.id)}
                onToday={() => void change(task, { plannedFor: task.plannedFor === today ? null : today })}
                onDone={() => void change(task, { stage: "done" })}
                onDrag={setDragged}
            />
        );
    }
    return (
        <Stack gap={3}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
                <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                        {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
                    </Typography>
                    <Typography variant="h4">{titles[view]}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {captions[view]}
                    </Typography>
                </Box>
                <Button
                    disabled={
                        !["mine", "all"].includes(scope) &&
                        spaces.find((space) => space.id === scope)?.role === "reader"
                    }
                    variant="contained"
                    startIcon={<AddRounded />}
                    onClick={() => setCreate(true)}
                >
                    Новая задача
                </Button>
            </Stack>
            {view === "today" && (
                <Box sx={{ p: 3, bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: 3 }}>
                    <Stack direction="row" gap={3} alignItems="center" flexWrap="wrap">
                        <Box
                            sx={{
                                p: 1.5,
                                bgcolor: "primary.light",
                                borderRadius: 2,
                                color: "primary.main",
                                display: "flex"
                            }}
                        >
                            <WbSunnyOutlined />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 160 }}>
                            <Typography variant="h6">
                                {dayTasks.length === 0
                                    ? "С чего начнём день?"
                                    : `${taskCount(dayTasks.filter((task) => task.stage !== "done").length)} в плане`}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {dayTasks.filter((task) => task.stage !== "done").length > 3
                                    ? "План получился большим. Можно оставить на сегодня самое важное."
                                    : "Обычно достаточно выбрать до трёх главных задач."}
                            </Typography>
                        </Box>
                        <Button component={Link} to="/board" color="inherit" endIcon={<ArrowForwardRounded />}>
                            Выбрать с доски
                        </Button>
                    </Stack>
                </Box>
            )}
            {error && <Alert severity="error">{message(error)}</Alert>}
            {isLoading && <LinearProgress />}
            <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                <TextField
                    placeholder="Поиск по задачам и заметкам"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    slotProps={{
                        input: { startAdornment: <SearchRounded sx={{ color: "text.disabled", mr: 1 }} /> },
                        htmlInput: { "aria-label": "Поиск по задачам" }
                    }}
                    sx={{ maxWidth: 440 }}
                />
                <TextField
                    select
                    label="Источник"
                    value={source}
                    onChange={(event) => setSource(event.target.value)}
                    sx={{ width: { xs: "100%", sm: 230 } }}
                >
                    <MenuItem value="all">Все источники</MenuItem>
                    <MenuItem value="local">Личные задачи</MenuItem>
                    {connections.map((connection) => (
                        <MenuItem key={connection.id} value={connection.id}>
                            {connection.name}
                        </MenuItem>
                    ))}
                </TextField>
                <Chip
                    label={taskCount(filtered.length)}
                    variant="outlined"
                    sx={{ alignSelf: "center", ml: { sm: "auto" } }}
                />
            </Stack>
            {!isLoading && base.length === 0 && (
                <Box
                    sx={{
                        textAlign: "center",
                        px: 3,
                        py: 7,
                        bgcolor: "background.paper",
                        border: "1px dashed",
                        borderColor: "divider",
                        borderRadius: 3
                    }}
                >
                    <ViewKanbanOutlined sx={{ color: "text.disabled", fontSize: 42, mb: 2 }} />
                    <Typography variant="h6">
                        {view === "today"
                            ? "Сегодняшний план пока свободен"
                            : view === "archive"
                              ? "Архив пока пуст"
                              : "Начни с одной задачи"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mx: "auto", mt: 1 }}>
                        {view === "today"
                            ? "Добавь задачу или нажми на значок солнца у карточки на доске. Незавершённые планы прошлых дней тоже появятся здесь."
                            : view === "archive"
                              ? "Сюда можно убрать карточки, сохранив все рабочие заметки."
                              : "Запиши то, что держишь в голове, или подключи рабочий трекер для импорта задач."}
                    </Typography>
                    {view !== "archive" && (
                        <Stack direction="row" gap={1} justifyContent="center" sx={{ mt: 3 }}>
                            <Button variant="outlined" onClick={() => setCreate(true)}>
                                Добавить задачу
                            </Button>
                            <Button component={Link} to="/connections" color="inherit">
                                Подключить трекер
                            </Button>
                        </Stack>
                    )}
                </Box>
            )}
            {base.length > 0 && filtered.length === 0 && (
                <Alert severity="info">По этим условиям задач нет. Измени поиск или источник.</Alert>
            )}
            {filtered.length > 0 &&
                (view === "board" ? (
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(5, minmax(225px, 1fr))",
                            gap: 2,
                            overflowX: "auto",
                            pb: 2
                        }}
                    >
                        {stages.map((stage) => (
                            <Box
                                key={stage.id}
                                onDragOver={(event) => {
                                    if (dragged) event.preventDefault();
                                }}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    const id = event.dataTransfer.getData("text/workdesk-task");
                                    const task = tasks.find((item) => item.id === id);
                                    if (task && task.stage !== stage.id) void change(task, { stage: stage.id });
                                    setDragged(null);
                                }}
                                sx={{ bgcolor: "background.default", minHeight: 330 }}
                            >
                                <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 2, px: 0.5 }}>
                                    <Box
                                        sx={{
                                            width: 7,
                                            height: 7,
                                            borderRadius: "50%",
                                            bgcolor:
                                                stage.id === "doing"
                                                    ? "primary.main"
                                                    : stage.id === "done"
                                                      ? "success.main"
                                                      : "text.disabled"
                                        }}
                                    />
                                    <Typography variant="body2" fontWeight={650}>
                                        {stage.label}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {filtered.filter((task) => task.stage === stage.id).length}
                                    </Typography>
                                </Stack>
                                <Stack gap={1.5}>{filtered.filter((task) => task.stage === stage.id).map(card)}</Stack>
                            </Box>
                        ))}
                    </Box>
                ) : (
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 2 }}>
                        {filtered.map(card)}
                    </Box>
                ))}
            <NewTaskDialog open={create} onClose={() => setCreate(false)} onCreated={select} today={view === "today"} />
            {selectedTask && <TaskDrawer key={selectedTask.id} task={selectedTask} onClose={() => select(null)} />}
            <Snackbar
                key={notice.key}
                open={!!notice.text}
                autoHideDuration={6000}
                onClose={() => setNotice((value) => ({ ...value, text: "" }))}
            >
                <Alert severity="error">{notice.text}</Alert>
            </Snackbar>
        </Stack>
    );
}
