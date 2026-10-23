import { useState } from "react";
import { Alert, Box, Button, Card, LinearProgress, MenuItem, Stack, TextField, Typography } from "@mui/material";
import useTasks from "@/hooks/useTasks";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useAuthSessionQuery } from "@/api/autogen/workdesk";
import { taskCount } from "@/common/models";
import { downloadMarkdown } from "@/common/markdown";
export default function ReportsPage() {
    const { tasks, error } = useTasks();
    const { scope } = useWorkspaceStore();
    const { data: session } = useAuthSessionQuery();
    const [project, setProject] = useState("all");
    const scoped = tasks.filter(
        (task) =>
            !task.archived &&
            (scope === "all" ||
                (scope === "mine"
                    ? !task.workspaceId || task.assigneeId === session?.userId
                    : task.workspaceId === scope))
    );
    const projects = [...new Set(scoped.map((task) => task.project))].sort();
    const selected = scoped.filter((task) => project === "all" || task.project === project);
    const names = [
        ...new Set(selected.map((task) => task.milestone || task.externalMilestone || "Без milestone"))
    ].sort();
    const report = names.map((name) => {
        const group = selected.filter((task) => (task.milestone || task.externalMilestone || "Без milestone") === name);
        const done = group.filter((task) => task.stage === "done");
        return { name, group, done, waiting: group.filter((task) => task.stage === "waiting") };
    });
    return (
        <Stack gap={3}>
            <Stack direction="row" justifyContent="space-between" gap={2} flexWrap="wrap">
                <Box>
                    <Typography variant="h4">Итоги по milestone</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Прогресс по статусам на доске выбранного пространства.
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    disabled={!report.length}
                    onClick={() =>
                        downloadMarkdown(
                            "Итоги по milestone",
                            "# Итоги по milestone\n\n" +
                                report
                                    .map(
                                        ({ name, group, done, waiting }) =>
                                            `## ${name}\n\nВыполнено ${done.length} из ${group.length}. В ожидании: ${waiting.length}.\n\n` +
                                            group
                                                .map(
                                                    (task) =>
                                                        `- [${task.stage === "done" ? "x" : " "}] ${task.title}${task.nextStep ? " — " + task.nextStep : ""}`
                                                )
                                                .join("\n")
                                    )
                                    .join("\n\n")
                        )
                    }
                >
                    Экспорт отчёта .md
                </Button>
            </Stack>
            <TextField
                select
                label="Проект"
                value={project}
                onChange={(event) => setProject(event.target.value)}
                sx={{ maxWidth: 360 }}
            >
                <MenuItem value="all">Все проекты</MenuItem>
                {projects.map((name) => (
                    <MenuItem key={name} value={name}>
                        {name || "Без проекта"}
                    </MenuItem>
                ))}
            </TextField>
            {error && <Alert severity="error">Не удалось загрузить задачи.</Alert>}
            {!report.length && (
                <Typography color="text.secondary">
                    Добавь milestone в карточку задачи или импортируй его из трекера.
                </Typography>
            )}
            {report.map(({ name, group, done, waiting }) => (
                <Card key={name} variant="outlined" sx={{ p: 3 }}>
                    <Stack gap={2}>
                        <Stack direction="row" justifyContent="space-between">
                            <Typography variant="h6">{name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {done.length} / {group.length}
                            </Typography>
                        </Stack>
                        <LinearProgress
                            variant="determinate"
                            value={(100 * done.length) / group.length}
                            sx={{ borderRadius: 2, height: 7 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                            {taskCount(done.length)} выполнено · {taskCount(waiting.length)} в ожидании
                        </Typography>
                        {group.map((task) => (
                            <Typography
                                key={task.id}
                                variant="body2"
                                color={task.stage === "done" ? "text.secondary" : "text.primary"}
                            >
                                {task.stage === "done" ? "✓" : "·"} {task.title}
                            </Typography>
                        ))}
                    </Stack>
                </Card>
            ))}
        </Stack>
    );
}
