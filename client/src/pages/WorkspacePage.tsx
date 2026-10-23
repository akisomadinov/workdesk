import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    IconButton,
    LinearProgress,
    MenuItem,
    Snackbar,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import WbSunnyOutlined from "@mui/icons-material/WbSunnyOutlined";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import { Link } from "react-router-dom";
import { message, sourceLabel, taskCount } from "@/common/models";
import type { TaskItem } from "@/common/models";
import { useUiStore } from "@/stores/useUiStore";
import useTaskWorkspace from "@/hooks/useTaskWorkspace";
import useLocalDay from "@/hooks/useLocalDay";
import DeleteMaterialDialog from "@/common/DeleteMaterialDialog";
import TaskCard from "./TaskCard";
import TaskBoard from "./tasks/TaskBoard";
import TaskDetails from "./tasks/TaskDetails";
import NewTaskDialog from "./NewTaskDialog";
import type { TaskValues } from "./validation";
export default function WorkspacePage({ view }: { view: "board" | "inbox" | "archive" }) {
    const { tasks, scoped, connections, update, error, isLoading, canCreate } = useTaskWorkspace();
    const { query, source, setQuery, setSource, select } = useUiStore();
    const [createStage, setCreateStage] = useState<TaskValues["stage"] | null>(null);
    const [todayOnly, setTodayOnly] = useState(false);
    const [notice, setNotice] = useState("");
    const [remove, setRemove] = useState<TaskItem | null>(null);
    const [dragged, setDragged] = useState<string | null>(null);
    const today = useLocalDay();
    const base = scoped.filter((task) =>
        view === "archive" ? task.archived : !task.archived && (view !== "inbox" || task.stage === "inbox")
    );
    const filtered = base.filter(
        (task) =>
            (view !== "board" || !todayOnly || task.plannedFor === today) &&
            (source === "all" || (source === "local" ? !task.connectionId : task.connectionId === source)) &&
            `${task.title} ${task.project} ${task.description} ${task.notes} ${task.nextStep}`
                .toLocaleLowerCase("ru-RU")
                .includes(query.toLocaleLowerCase("ru-RU"))
    );
    const rank: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
    filtered.sort((a, b) => (rank[a.priority] ?? 2) - (rank[b.priority] ?? 2));
    async function change(task: TaskItem, value: Partial<TaskItem>) {
        if (task.canEdit === false) return;
        try {
            await update(task, value);
        } catch (failure) {
            setNotice(message(failure));
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
                onStage={(stage) => void change(task, { stage })}
                onDrag={setDragged}
                onDelete={() => setRemove(task)}
            />
        );
    }
    return (
        <Stack gap={3} sx={{ minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                <Typography variant="h4">Задачи</Typography>
                <Button
                    disabled={!canCreate}
                    variant="contained"
                    startIcon={<AddRounded />}
                    onClick={() => setCreateStage("inbox")}
                >
                    Новая задача
                </Button>
            </Stack>
            <Stack direction="row" alignItems="center" sx={{ borderBottom: 1, borderColor: "divider" }}>
                <Tabs
                    value={view}
                    variant="scrollable"
                    allowScrollButtonsMobile
                    aria-label="Виды задач"
                    sx={{ minWidth: 0 }}
                >
                    <Tab component={Link} to="/board" value="board" label="Доска" />
                    <Tab component={Link} to="/inbox" value="inbox" label="Входящие" />
                    <Tab component={Link} to="/archive" value="archive" label="Архив" />
                </Tabs>
                <IconButton component={Link} to="/trash" aria-label="Корзина" title="Корзина" sx={{ ml: "auto" }}>
                    <DeleteOutlineRounded fontSize="small" />
                </IconButton>
            </Stack>
            {error && <Alert severity="error">{message(error)}</Alert>}
            {isLoading && <LinearProgress />}
            {(base.length > 0 || query || source !== "all") && (
                <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="center">
                    <TextField
                        placeholder="Поиск по задачам и заметкам"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        slotProps={{
                            input: {
                                startAdornment: <SearchRounded sx={{ color: "text.disabled", mr: 1 }} />,
                                endAdornment: query ? (
                                    <IconButton size="small" aria-label="Очистить поиск" onClick={() => setQuery("")}>
                                        <CloseRounded fontSize="small" />
                                    </IconButton>
                                ) : undefined
                            },
                            htmlInput: { "aria-label": "Поиск по задачам" }
                        }}
                        sx={{ width: { xs: "100%", sm: 360 } }}
                    />
                    {connections.length > 0 && (
                        <TextField
                            select
                            label="Источник"
                            value={source}
                            onChange={(event) => setSource(event.target.value)}
                            sx={{ width: { xs: "100%", sm: 220 } }}
                        >
                            <MenuItem value="all">Все источники</MenuItem>
                            <MenuItem value="local">Созданы в Workdesk</MenuItem>
                            {connections.map((connection) => (
                                <MenuItem key={connection.id} value={connection.id}>
                                    {connection.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}
                    {view === "board" && (
                        <Button
                            color={todayOnly ? "primary" : "inherit"}
                            variant={todayOnly ? "outlined" : "text"}
                            startIcon={<WbSunnyOutlined />}
                            aria-pressed={todayOnly}
                            onClick={() => setTodayOnly(!todayOnly)}
                        >
                            На сегодня
                        </Button>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                        {taskCount(filtered.length)}
                    </Typography>
                </Stack>
            )}
            {base.length > 0 && !filtered.length && (
                <Alert
                    severity="info"
                    action={
                        <Button
                            size="small"
                            onClick={() => {
                                setQuery("");
                                setSource("all");
                                setTodayOnly(false);
                            }}
                        >
                            Сбросить
                        </Button>
                    }
                >
                    По этим условиям задач нет.
                </Alert>
            )}
            {view === "board" && !isLoading ? (
                <TaskBoard
                    tasks={filtered}
                    renderCard={card}
                    canCreate={canCreate}
                    dragged={dragged}
                    onCreate={setCreateStage}
                    onMove={(id, stage) => {
                        const task = tasks.find((item) => item.id === id);
                        if (task && task.stage !== stage) void change(task, { stage });
                        setDragged(null);
                    }}
                />
            ) : (
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))",
                        gap: 2
                    }}
                >
                    {filtered.map(card)}
                </Box>
            )}
            {!isLoading && !base.length && view !== "board" && (
                <Box sx={{ py: 6, textAlign: "center" }}>
                    <Typography color="text.secondary">
                        {view === "archive" ? "В архиве пока нет задач" : "Новых задач пока нет"}
                    </Typography>
                    <Button component={Link} to="/board" sx={{ mt: 1 }}>
                        На доску
                    </Button>
                </Box>
            )}
            {createStage && (
                <NewTaskDialog
                    open
                    onClose={() => setCreateStage(null)}
                    onCreated={select}
                    today={false}
                    stage={createStage}
                />
            )}
            {remove && (
                <DeleteMaterialDialog
                    kind="task"
                    item={remove}
                    onClose={() => setRemove(null)}
                    onDeleted={() => {
                        setRemove(null);
                        setNotice("Задача перемещена в корзину");
                    }}
                />
            )}
            <TaskDetails tasks={tasks} />
            <Snackbar open={!!notice} message={notice} autoHideDuration={5000} onClose={() => setNotice("")} />
        </Stack>
    );
}
