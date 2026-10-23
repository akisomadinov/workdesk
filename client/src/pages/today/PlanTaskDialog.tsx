import { useState } from "react";
import {
    Alert,
    Autocomplete,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { message } from "@/common/models";
import type { TaskItem } from "@/common/models";
const schema = z.object({ taskId: z.string().min(1, "Выбери задачу") });
export default function PlanTaskDialog({
    tasks,
    onClose,
    onPlan
}: {
    tasks: TaskItem[];
    onClose: () => void;
    onPlan: (task: TaskItem) => Promise<void>;
}) {
    const form = useForm({ resolver: zodResolver(schema), mode: "onChange", defaultValues: { taskId: "" } });
    const [error, setError] = useState("");
    return (
        <Dialog open onClose={form.formState.isSubmitting ? undefined : onClose}>
            <form
                onSubmit={form.handleSubmit(async ({ taskId }) => {
                    const task = tasks.find((item) => item.id === taskId);
                    if (!task) return;
                    try {
                        await onPlan(task);
                        onClose();
                    } catch (failure) {
                        setError(message(failure));
                    }
                })}
            >
                <DialogTitle>Добавить в план на сегодня</DialogTitle>
                <DialogContent>
                    <Stack gap={2} sx={{ pt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Выбери одну задачу, которую хочешь продвинуть сегодня.
                        </Typography>
                        <Controller
                            control={form.control}
                            name="taskId"
                            render={({ field, fieldState }) => (
                                <Autocomplete
                                    options={tasks}
                                    value={tasks.find((task) => task.id === field.value) ?? null}
                                    onChange={(_, task) => field.onChange(task?.id ?? "")}
                                    getOptionLabel={(task) => task.title}
                                    isOptionEqualToValue={(a, b) => a.id === b.id}
                                    openText="Открыть список"
                                    closeText="Закрыть список"
                                    clearText="Очистить"
                                    noOptionsText="Все подходящие задачи уже в плане"
                                    renderOption={(props, task) => {
                                        const { key, ...rest } = props;
                                        return (
                                            <li key={key} {...rest}>
                                                <Stack>
                                                    <Typography variant="body2">{task.title}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {task.project || "Без проекта"}
                                                    </Typography>
                                                </Stack>
                                            </li>
                                        );
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            autoFocus
                                            label="Найти задачу"
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                        />
                                    )}
                                />
                            )}
                        />
                        {error && <Alert severity="error">{error}</Alert>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button color="inherit" onClick={onClose} disabled={form.formState.isSubmitting}>
                        Отмена
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={form.formState.isSubmitting || !form.formState.isValid}
                    >
                        На сегодня
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
