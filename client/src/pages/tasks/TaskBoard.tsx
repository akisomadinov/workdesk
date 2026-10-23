import { useState } from "react";
import type { ReactNode } from "react";
import { Box, Button, IconButton, Stack, Tab, Tabs, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import { stages } from "@/common/models";
import type { TaskItem } from "@/common/models";
import type { TaskValues } from "../validation";
interface Props {
    tasks: TaskItem[];
    renderCard: (task: TaskItem) => ReactNode;
    canCreate: boolean;
    onCreate: (stage: TaskValues["stage"]) => void;
    onMove: (id: string, stage: string) => void;
    dragged: string | null;
}
export default function TaskBoard({ tasks, renderCard, canCreate, onCreate, onMove, dragged }: Props) {
    const mobile = useMediaQuery(useTheme().breakpoints.down("md"));
    const [stageId, setStageId] = useState("inbox");
    const [over, setOver] = useState<string | null>(null);
    const hints: Record<string, string> = {
        inbox: "Новые задачи",
        planned: "Следующие в очереди",
        doing: "Задачи, над которыми работаешь",
        waiting: "Нужен ответ или решение",
        done: "Завершённые задачи"
    };
    return (
        <Box sx={{ minWidth: 0 }}>
            {mobile && (
                <Tabs
                    value={stageId}
                    onChange={(_, value: string) => setStageId(value)}
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label="Колонки доски"
                    sx={{ mb: 2 }}
                >
                    {stages.map((stage) => (
                        <Tab
                            key={stage.id}
                            value={stage.id}
                            label={`${stage.label} · ${tasks.filter((task) => task.stage === stage.id).length}`}
                        />
                    ))}
                </Tabs>
            )}
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: mobile ? "minmax(0, 1fr)" : "repeat(5, minmax(210px, 1fr))",
                    gap: 2,
                    overflowX: "auto",
                    pb: 2,
                    alignItems: "start"
                }}
            >
                {stages
                    .filter((stage) => !mobile || stage.id === stageId)
                    .map((stage) => {
                        const items = tasks.filter((task) => task.stage === stage.id);
                        return (
                            <Box
                                key={stage.id}
                                component="section"
                                aria-label={`${stage.label}: ${items.length}`}
                                onDragOver={(event) => {
                                    if (dragged) {
                                        event.preventDefault();
                                        event.dataTransfer.dropEffect = "move";
                                        setOver(stage.id);
                                    }
                                }}
                                onDragLeave={(event) => {
                                    if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                                        setOver(null);
                                }}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    setOver(null);
                                    const id = event.dataTransfer.getData("text/workdesk-task");
                                    if (id) onMove(id, stage.id);
                                }}
                                sx={{
                                    minHeight: 280,
                                    borderRadius: 1.5,
                                    bgcolor: dragged && over === stage.id ? "primary.light" : "transparent",
                                    transition: "background-color 120ms"
                                }}
                            >
                                {!mobile && (
                                    <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 1.5, px: 0.5 }}>
                                        <Box
                                            sx={{
                                                width: 7,
                                                height: 7,
                                                borderRadius: "50%",
                                                bgcolor:
                                                    stage.id === "doing"
                                                        ? "primary.main"
                                                        : stage.id === "waiting"
                                                          ? "warning.main"
                                                          : stage.id === "done"
                                                            ? "success.main"
                                                            : "text.disabled"
                                            }}
                                        />
                                        <Typography variant="body2" fontWeight={650}>
                                            {stage.label}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {items.length}
                                        </Typography>
                                        {canCreate && (
                                            <Tooltip title={`Добавить в «${stage.label}»`}>
                                                <IconButton
                                                    size="small"
                                                    aria-label={`Добавить в «${stage.label}»`}
                                                    onClick={() => onCreate(stage.id as TaskValues["stage"])}
                                                    sx={{ ml: "auto" }}
                                                >
                                                    <AddRounded sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Stack>
                                )}
                                <Stack gap={1.25}>{items.map(renderCard)}</Stack>
                                {!items.length && (
                                    <Box
                                        sx={{
                                            border: 1,
                                            borderStyle: "dashed",
                                            borderColor: "divider",
                                            p: 2.5,
                                            borderRadius: 1.5,
                                            textAlign: "center"
                                        }}
                                    >
                                        <Typography variant="body2" color="text.secondary">
                                            {hints[stage.id]}
                                        </Typography>
                                        {canCreate && mobile && (
                                            <Button
                                                size="small"
                                                color="inherit"
                                                startIcon={<AddRounded />}
                                                onClick={() => onCreate(stage.id as TaskValues["stage"])}
                                                sx={{ mt: 1 }}
                                            >
                                                Добавить
                                            </Button>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        );
                    })}
            </Box>
        </Box>
    );
}
