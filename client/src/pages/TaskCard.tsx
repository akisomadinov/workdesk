import { memo } from "react";
import { Box, Card, CardActionArea, Divider, IconButton, Menu, MenuItem, Stack, Typography } from "@mui/material";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import ScheduleRounded from "@mui/icons-material/ScheduleRounded";
import useContextMenu from "@/hooks/useContextMenu";
import type { TaskItem } from "@/common/models";
import { localDate, stages } from "@/common/models";
interface Props {
    task: TaskItem;
    source: string;
    onOpen: () => void;
    onToday: () => void;
    onDelete: () => void;
    onStage: (stage: string) => void;
    onDrag: (id: string | null) => void;
}
function TaskCard({ task, source, onOpen, onToday, onStage, onDrag, onDelete }: Props) {
    const menu = useContextMenu();
    const editable = task.canEdit !== false;
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
                onContextMenu={menu.triggerProps.onContextMenu}
                onKeyDown={menu.triggerProps.onKeyDown}
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
                    aria-haspopup="menu"
                    aria-expanded={menu.open}
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
                {editable && (
                    <IconButton
                        size="small"
                        aria-label={`Действия: ${task.title}`}
                        onClick={menu.openButton}
                        aria-haspopup="menu"
                        aria-expanded={menu.open}
                        sx={{ position: "absolute", top: 8, right: 6, color: "text.secondary" }}
                    >
                        <MoreHorizRounded fontSize="small" />
                    </IconButton>
                )}
            </Card>
            <Menu {...menu.menuProps}>
                <MenuItem
                    onClick={() => {
                        menu.close();
                        onOpen();
                    }}
                >
                    Открыть задачу
                </MenuItem>
                {editable && (
                    <MenuItem
                        onClick={() => {
                            menu.close();
                            onToday();
                        }}
                    >
                        {task.plannedFor === today ? "Убрать из плана на сегодня" : "На сегодня"}
                    </MenuItem>
                )}
                {editable && <Divider />}
                {editable && (
                    <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: "block" }}>
                        Переместить
                    </Typography>
                )}
                {editable &&
                    stages
                        .filter((stage) => stage.id !== task.stage)
                        .map((stage) => (
                            <MenuItem
                                key={stage.id}
                                onClick={() => {
                                    menu.close();
                                    onStage(stage.id);
                                }}
                            >
                                <ArrowForwardRounded sx={{ fontSize: 16, mr: 1, color: "text.secondary" }} />
                                {stage.label}
                            </MenuItem>
                        ))}
                {editable && <Divider />}
                {editable && (
                    <MenuItem
                        sx={{ color: "error.main" }}
                        onClick={() => {
                            menu.close();
                            onDelete();
                        }}
                    >
                        Удалить
                    </MenuItem>
                )}
            </Menu>
        </>
    );
}
export default memo(TaskCard);
