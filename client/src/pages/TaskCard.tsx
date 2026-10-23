import { memo } from "react";
import { Box, Button, Card, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import CheckRounded from "@mui/icons-material/CheckRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import WbSunnyOutlined from "@mui/icons-material/WbSunnyOutlined";
import NotesRounded from "@mui/icons-material/NotesRounded";
import type { TaskItem } from "@/common/models";
import { localDate, priorities } from "@/common/models";
interface Props {
    task: TaskItem;
    source: string;
    onOpen: () => void;
    onToday: () => void;
    onDone: () => void;
    onDrag: (id: string) => void;
}
function TaskCard({ task, source, onOpen, onToday, onDone, onDrag }: Props) {
    const urgent = task.priority === "urgent" || task.priority === "high";
    return (
        <Card
            variant="outlined"
            draggable={task.canEdit !== false}
            onDragStart={(event) => {
                event.dataTransfer.setData("text/workdesk-task", task.id);
                onDrag(task.id);
            }}
            sx={{
                p: 2,
                borderColor: "divider",
                borderRadius: 2.5,
                transition: "border-color 120ms",
                "&:hover": { borderColor: "primary.main" }
            }}
        >
            <Stack gap={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: "80%" }}>
                        {task.project || source}
                    </Typography>
                    {urgent && (
                        <Box
                            sx={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                bgcolor: task.priority === "urgent" ? "error.main" : "warning.main",
                                flexShrink: 0
                            }}
                        />
                    )}
                </Stack>
                <Button
                    onClick={onOpen}
                    color="inherit"
                    sx={{
                        justifyContent: "flex-start",
                        textAlign: "left",
                        p: 0,
                        fontSize: 14,
                        fontWeight: 600,
                        lineHeight: 1.6,
                        overflowWrap: "anywhere",
                        "&:hover": { bgcolor: "transparent", color: "primary.main" }
                    }}
                >
                    {task.title}
                </Button>
                {task.nextStep && (
                    <Stack direction="row" gap={0.75} alignItems="flex-start">
                        <ArrowForwardRounded sx={{ fontSize: 15, mt: 0.3, color: "primary.main" }} />
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                overflowWrap: "anywhere"
                            }}
                        >
                            {task.nextStep}
                        </Typography>
                    </Stack>
                )}
                {task.stage === "waiting" && task.blocker && (
                    <Typography variant="caption" color="warning.main" sx={{ overflowWrap: "anywhere" }}>
                        Ожидаю: {task.blocker}
                    </Typography>
                )}
                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                    <Chip
                        label={priorities.find((x) => x.id === task.priority)?.label}
                        size="small"
                        sx={{
                            bgcolor: urgent ? "warning.light" : "background.default",
                            color: urgent ? "warning.main" : "text.secondary",
                            fontSize: 11
                        }}
                    />
                    <Stack direction="row" gap={0.25} alignItems="center">
                        {task.notes && (
                            <Tooltip title="Есть заметки">
                                <NotesRounded sx={{ color: "text.disabled", fontSize: 16, mr: 0.5 }} />
                            </Tooltip>
                        )}
                        <Tooltip
                            title={
                                task.plannedFor === localDate()
                                    ? "Убрать из плана на сегодня"
                                    : "Запланировать на сегодня"
                            }
                        >
                            <IconButton
                                size="small"
                                aria-label={task.plannedFor === localDate() ? "Убрать с сегодня" : "На сегодня"}
                                onClick={onToday}
                                disabled={task.canEdit === false}
                                sx={{ color: task.plannedFor === localDate() ? "primary.main" : "text.disabled" }}
                            >
                                <WbSunnyOutlined fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        {task.stage !== "done" && (
                            <Tooltip title="Отметить выполненной">
                                <IconButton
                                    size="small"
                                    aria-label="Завершить задачу"
                                    onClick={onDone}
                                    disabled={task.canEdit === false}
                                    sx={{ color: "text.disabled", "&:hover": { color: "success.main" } }}
                                >
                                    <CheckRounded fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </Stack>
                {task.connectionId && (
                    <Typography variant="caption" color="text.disabled" noWrap>
                        {source} · {task.externalState === "closed" ? "Закрыта в трекере" : "Из трекера"}
                    </Typography>
                )}
            </Stack>
        </Card>
    );
}
export default memo(TaskCard);
