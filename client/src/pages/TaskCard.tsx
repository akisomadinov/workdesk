import { memo, useState } from "react";
import { Box, Card, CardActionArea, Divider, IconButton, Menu, MenuItem, Stack, Typography } from "@mui/material";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import ScheduleRounded from "@mui/icons-material/ScheduleRounded";
import type { TaskItem } from "@/common/models";
import { localDate, stages } from "@/common/models";
interface Props {
    task: TaskItem;
    source: string;
    onOpen: () => void;
    onToday: () => void;
    onStage: (stage: string) => void;
    onDrag: (id: string | null) => void;
}
function TaskCard({ task, source, onOpen, onToday, onStage, onDrag }: Props) {
    const [menu, setMenu] = useState<HTMLElement | null>(null);
    const urgent = task.priority === "urgent" || task.priority === "high";
    const waiting = task.stage === "waiting";
    const today = localDate();
    const overdue = !!task.plannedFor && task.plannedFor < today && task.stage !== "done";
    const dateLabel =
        task.plannedFor === today
            ? "Сегодня"
            : task.plannedFor
              ? new Date(`${task.plannedFor}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
              : "";
    const next = waiting && task.blocker ? task.blocker : task.nextStep;
    return (
        <>
            <Card
                variant="outlined"
                draggable={task.canEdit !== false}
                onDragStart={(event) => {
                    event.dataTransfer.setData("text/workdesk-task", task.id);
                    event.dataTransfer.effectAllowed = "move";
                    onDrag(task.id);
                }}
                onDragEnd={() => onDrag(null)}
                sx={{
                    position: "relative",
                    borderRadius: 1.5,
                    transition: "border-color 120ms",
                    "&:hover": { borderColor: "text.disabled" }
                }}
            >
                <CardActionArea
                    onClick={onOpen}
                    aria-label={`Открыть задачу: ${task.title}`}
                    sx={{ p: 2, display: "block", textAlign: "left" }}
                >
                    <Stack gap={1.25}>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ pr: 3 }}>
                            {task.project || (task.workspaceId ? "Командная задача" : "Личная задача")}
                            {task.connectionId && ` · ${source}`}
                        </Typography>
                        <Typography
                            variant="body2"
                            fontWeight={650}
                            sx={{ lineHeight: 1.55, overflowWrap: "anywhere" }}
                        >
                            {task.title}
                        </Typography>
                        {task.stage !== "done" && (
                            <Box sx={{ borderLeft: 2, borderColor: waiting ? "warning.main" : "divider", pl: 1.25 }}>
                                <Typography variant="caption" color={waiting ? "warning.main" : "text.secondary"}>
                                    {waiting && task.blocker ? "Ожидаем" : "Дальше"}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color={next ? "text.primary" : "text.secondary"}
                                    sx={{
                                        mt: 0.25,
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                        overflowWrap: "anywhere"
                                    }}
                                >
                                    {next || "Укажи следующий шаг"}
                                </Typography>
                            </Box>
                        )}
                        {(dateLabel || urgent) && (
                            <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
                                {dateLabel && (
                                    <Stack
                                        direction="row"
                                        gap={0.5}
                                        alignItems="center"
                                        sx={{ color: overdue ? "warning.main" : "text.secondary" }}
                                    >
                                        <ScheduleRounded sx={{ fontSize: 14 }} />
                                        <Typography variant="caption">
                                            {overdue ? `Перенести с ${dateLabel}` : dateLabel}
                                        </Typography>
                                    </Stack>
                                )}
                                {urgent && (
                                    <Typography
                                        variant="caption"
                                        color={task.priority === "urgent" ? "error.main" : "warning.main"}
                                    >
                                        {task.priority === "urgent" ? "Срочно" : "Высокий приоритет"}
                                    </Typography>
                                )}
                            </Stack>
                        )}
                    </Stack>
                </CardActionArea>
                {task.canEdit !== false && (
                    <IconButton
                        size="small"
                        aria-label={`Действия: ${task.title}`}
                        onClick={(event) => setMenu(event.currentTarget)}
                        sx={{ position: "absolute", top: 8, right: 6, color: "text.secondary" }}
                    >
                        <MoreHorizRounded fontSize="small" />
                    </IconButton>
                )}
            </Card>
            <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
                <MenuItem
                    onClick={() => {
                        setMenu(null);
                        onToday();
                    }}
                >
                    {task.plannedFor === today ? "Убрать из плана на сегодня" : "На сегодня"}
                </MenuItem>
                <Divider />
                <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: "block" }}>
                    Переместить
                </Typography>
                {stages
                    .filter((stage) => stage.id !== task.stage)
                    .map((stage) => (
                        <MenuItem
                            key={stage.id}
                            onClick={() => {
                                setMenu(null);
                                onStage(stage.id);
                            }}
                        >
                            <ArrowForwardRounded sx={{ fontSize: 16, mr: 1, color: "text.secondary" }} />
                            {stage.label}
                        </MenuItem>
                    ))}
            </Menu>
        </>
    );
}
export default memo(TaskCard);
