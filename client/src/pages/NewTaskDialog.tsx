import { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTasksSaveMutation } from "@/api/autogen/workdesk";
import { taskSchema } from "./validation";
import type { TaskValues } from "./validation";
import { localDate, message } from "@/common/models";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
export default function NewTaskDialog({
    open,
    onClose,
    onCreated,
    today,
    stage = "inbox"
}: {
    open: boolean;
    onClose: () => void;
    onCreated: (id: string) => void;
    today: boolean;
    stage?: TaskValues["stage"];
}) {
    const { scope } = useWorkspaceStore();
    const [save, { isLoading }] = useTasksSaveMutation();
    const [error, setError] = useState("");
    const form = useForm<TaskValues>({
        resolver: zodResolver(taskSchema),
        mode: "onChange",
        defaultValues: {
            documentIds: [],
            workspaceId: "",
            assigneeId: "",
            milestone: "",
            title: "",
            project: "",
            description: "",
            notes: "",
            nextStep: "",
            blocker: "",
            stage: "inbox",
            priority: "normal",
            plannedFor: ""
        }
    });
    async function submit(values: TaskValues) {
        setError("");
        try {
            const task = await save({
                saveTaskRequest: {
                    ...values,
                    workspaceId: ["mine", "all"].includes(scope) ? null : scope,
                    assigneeId: null,
                    plannedFor: today ? localDate() : null,
                    stage: today ? "planned" : stage,
                    revision: 0
                }
            }).unwrap();
            form.reset();
            onClose();
            if (task.id) onCreated(task.id);
        } catch (failure) {
            setError(message(failure));
        }
    }
    return (
        <Dialog open={open} onClose={isLoading ? undefined : onClose}>
            <form onSubmit={form.handleSubmit(submit)}>
                <DialogTitle>Новая задача</DialogTitle>
                <DialogContent>
                    <Stack gap={2} sx={{ pt: 1 }}>
                        {error && <Alert severity="error">{error}</Alert>}
                        <TextField
                            autoFocus
                            label="Что нужно сделать"
                            {...form.register("title")}
                            error={!!form.formState.errors.title}
                            helperText={form.formState.errors.title?.message}
                        />
                        <TextField
                            label="Проект или направление"
                            {...form.register("project")}
                            error={!!form.formState.errors.project}
                            helperText={form.formState.errors.project?.message}
                        />
                        <TextField
                            label="Следующий шаг"
                            placeholder="Например, проверить ответ API"
                            multiline
                            minRows={2}
                            {...form.register("nextStep")}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={onClose} disabled={isLoading}>
                        Отмена
                    </Button>
                    <Button variant="contained" type="submit" disabled={isLoading}>
                        Создать задачу
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
