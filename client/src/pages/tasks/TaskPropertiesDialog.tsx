import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import { useWatch } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { useAuthSessionQuery, useTeamGetQuery } from "@/api/autogen/workdesk";
import type { TaskValues } from "../validation";
import { dateTime, priorities } from "@/common/models";
import type { TaskItem } from "@/common/models";
export default function TaskPropertiesDialog({
    task,
    form,
    onClose
}: {
    task: TaskItem;
    form: UseFormReturn<TaskValues>;
    onClose: () => void;
}) {
    const { data: spaces = [] } = useTeamGetQuery();
    const { data: session } = useAuthSessionQuery();
    const {
        register,
        setValue,
        control,
        formState: { errors }
    } = form;
    const values = useWatch({ control });
    const readOnly = task.canEdit === false;
    const props = { disabled: readOnly };
    return (
        <Dialog open onClose={onClose}>
            <DialogTitle>Свойства задачи</DialogTitle>
            <DialogContent>
                <Stack gap={2.5} sx={{ pt: 1 }}>
                    <TextField
                        select
                        label="Кому доступна"
                        value={values.workspaceId ?? ""}
                        {...register("workspaceId")}
                        slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
                        disabled={readOnly || task.ownerId !== session?.userId}
                        onChange={(event) => {
                            setValue("workspaceId", event.target.value, { shouldDirty: true });
                            setValue("assigneeId", "", { shouldDirty: true });
                            setValue("documentIds", [], { shouldDirty: true });
                        }}
                        helperText="При смене пространства ссылки на документы будут сняты. Сами документы останутся на месте."
                    >
                        <MenuItem value="">Только мне</MenuItem>
                        {spaces
                            .filter((space) => space.role !== "reader" || space.id === task.workspaceId)
                            .map((space) => (
                                <MenuItem key={space.id} value={space.id}>
                                    {space.name}
                                </MenuItem>
                            ))}
                    </TextField>
                    {!!values.workspaceId && (
                        <TextField
                            select
                            label="Исполнитель"
                            value={values.assigneeId ?? ""}
                            {...register("assigneeId")}
                            {...props}
                            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
                        >
                            <MenuItem value="">Не назначен</MenuItem>
                            {spaces
                                .find((space) => space.id === values.workspaceId)
                                ?.members?.map((person) => (
                                    <MenuItem key={person.id} value={person.id}>
                                        {person.name}
                                    </MenuItem>
                                ))}
                        </TextField>
                    )}
                    <TextField
                        label="Проект"
                        {...register("project")}
                        disabled={readOnly || !!task.connectionId}
                        error={!!errors.project}
                        helperText={errors.project?.message}
                    />
                    <TextField
                        label="Milestone"
                        {...register("milestone")}
                        placeholder={task.externalMilestone || "Например, версия 1.0"}
                        {...props}
                        error={!!errors.milestone}
                        helperText={
                            errors.milestone?.message ||
                            (task.externalMilestone ? `В трекере: ${task.externalMilestone}` : "Для итогов по этапу")
                        }
                    />
                    <TextField
                        select
                        label="Приоритет"
                        value={values.priority ?? "normal"}
                        {...register("priority")}
                        {...props}
                    >
                        {priorities.map((priority) => (
                            <MenuItem key={priority.id} value={priority.id}>
                                {priority.label}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        type="date"
                        label="Запланировано на"
                        slotProps={{ inputLabel: { shrink: true } }}
                        {...register("plannedFor")}
                        {...props}
                    />
                    <Typography variant="caption" color="text.secondary">
                        Создана {dateTime(task.created)}
                    </Typography>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Готово</Button>
            </DialogActions>
        </Dialog>
    );
}
