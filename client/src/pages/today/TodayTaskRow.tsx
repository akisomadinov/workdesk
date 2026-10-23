import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import CheckRounded from "@mui/icons-material/CheckRounded";
import type { TaskItem } from "@/common/models";
import TodayTaskMenu from "./TodayTaskMenu";
import { isOverdue, planDate } from "./today";
interface Props {
    task: TaskItem;
    today: string;
    busy: boolean;
    onOpen: () => void;
    onChange: (change: Partial<TaskItem>) => void;
    onDelete: () => void;
}
export default function TodayTaskRow({ task, today, busy, onOpen, onChange, onDelete }: Props) {
    const waiting = task.stage === "waiting";
    const text = waiting
        ? task.blocker || "Уточни, чей ответ или какое решение нужно"
        : task.nextStep || "Укажи следующий шаг";
    const editable = task.canEdit !== false;
    return (
        <Stack
            direction="row"
            gap={1.5}
            alignItems="flex-start"
            sx={{ py: 2, borderBottom: 1, borderColor: "divider", minWidth: 0 }}
        >
            {editable && task.stage !== "done" && !waiting && (
                <IconButton
                    aria-label={`Завершить: ${task.title}`}
                    disabled={busy}
                    onClick={() => onChange({ stage: "done" })}
                    sx={{ mt: 0.25, width: 32, height: 32, border: 1, borderColor: "divider", color: "text.secondary" }}
                >
                    <CheckRounded sx={{ fontSize: 17 }} />
                </IconButton>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Button
                    color="inherit"
                    onClick={onOpen}
                    sx={{
                        p: 0,
                        minWidth: 0,
                        display: "block",
                        textAlign: "left",
                        lineHeight: 1.5,
                        fontSize: 14,
                        overflowWrap: "anywhere",
                        "&:hover": { bgcolor: "transparent", color: "primary.main" }
                    }}
                >
                    {task.title}
                </Button>
                {task.stage !== "done" && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                            mt: 0.5,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            overflowWrap: "anywhere"
                        }}
                    >
                        {text}
                    </Typography>
                )}
                <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="center" sx={{ mt: 0.75 }}>
                    {task.project && (
                        <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                            {task.project}
                        </Typography>
                    )}
                    {isOverdue(task, today) && (
                        <Typography variant="caption" color="warning.main">
                            План на {planDate(task.plannedFor!)}
                        </Typography>
                    )}
                    {waiting && task.plannedFor && !isOverdue(task, today) && (
                        <Typography variant="caption" color="text.secondary">
                            {task.plannedFor === today ? "Проверить сегодня" : `План на ${planDate(task.plannedFor)}`}
                        </Typography>
                    )}
                    {waiting && editable && (
                        <Button
                            size="small"
                            color="inherit"
                            disabled={busy}
                            sx={{ p: 0, minHeight: 28 }}
                            onClick={() => onChange({ stage: "planned", plannedFor: today })}
                        >
                            Ответ получен
                        </Button>
                    )}
                    {isOverdue(task, today) && editable && !waiting && (
                        <Button
                            size="small"
                            disabled={busy}
                            sx={{ p: 0, minHeight: 28 }}
                            onClick={() => onChange({ plannedFor: today })}
                        >
                            На сегодня
                        </Button>
                    )}
                </Stack>
            </Box>
            {editable && (
                <TodayTaskMenu
                    task={task}
                    today={today}
                    busy={busy}
                    onOpen={onOpen}
                    onChange={onChange}
                    onDelete={onDelete}
                />
            )}
        </Stack>
    );
}
