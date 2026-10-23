import { useState } from "react";
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    TextField
} from "@mui/material";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useNotesSaveMutation, useTeamGetQuery } from "@/api/autogen/workdesk";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { noteTemplates } from "./markdown";
import type { NoteLink } from "./markdown";
import { message } from "./models";
const schema = z.object({
    title: z.string().trim().min(1, "Укажи название").max(200, "До 200 символов"),
    template: z.enum(["blank", "meeting", "investigation", "daily"]),
    workspaceId: z.string()
});
export default function NewDocumentDialog({
    onClose,
    parent,
    task,
    onCreated
}: {
    onClose: () => void;
    parent?: NoteLink;
    task?: { id: string; title: string; workspaceId?: string | null; project: string };
    onCreated?: (id: string) => Promise<void>;
}) {
    const { scope } = useWorkspaceStore();
    const { data: spaces = [] } = useTeamGetQuery();
    const [save] = useNotesSaveMutation();
    const navigate = useNavigate();
    const [error, setError] = useState("");
    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        mode: "onChange",
        defaultValues: {
            title: task ? task.title.slice(0, 200) : "",
            template: "blank",
            workspaceId: task
                ? (task.workspaceId ?? "")
                : parent
                  ? (parent.workspaceId ?? "")
                  : ["mine", "all"].includes(scope)
                    ? ""
                    : scope
        }
    });
    const values = useWatch({ control: form.control });
    return (
        <Dialog open onClose={form.formState.isSubmitting ? undefined : onClose}>
            <form
                onSubmit={form.handleSubmit(async (value) => {
                    try {
                        const result = await save({
                            saveNoteRequest: {
                                title: value.title,
                                body:
                                    (task ? `[К задаче](/board?task=${task.id})\n\n` : "") +
                                    noteTemplates[value.template].body,
                                project: task?.project ?? "",
                                workspaceId: value.workspaceId || null,
                                parentId: parent?.id
                            }
                        }).unwrap();
                        if (onCreated && result.id) await onCreated(result.id);
                        onClose();
                        if (!onCreated) navigate(`/notes/${result.id}`);
                    } catch (failure) {
                        setError(message(failure));
                    }
                })}
            >
                <DialogTitle>{parent ? "Вложенный документ" : "Новый документ"}</DialogTitle>
                <DialogContent>
                    <Stack gap={2.5} sx={{ pt: 1 }}>
                        <TextField
                            autoFocus
                            label="Название"
                            placeholder="Например, запуск проекта"
                            {...form.register("title")}
                            error={!!form.formState.errors.title}
                            helperText={form.formState.errors.title?.message}
                        />
                        <TextField select label="С чего начать" value={values.template} {...form.register("template")}>
                            {Object.entries(noteTemplates).map(([key, template]) => (
                                <MenuItem key={key} value={key}>
                                    {template.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
                            label="Кому доступен"
                            value={values.workspaceId}
                            {...form.register("workspaceId")}
                            disabled={!!parent || !!task}
                            helperText={
                                task
                                    ? "Документ будет доступен тем же людям, что и задача."
                                    : parent
                                      ? `Внутри «${parent.title}» · доступ как у родительского документа`
                                      : values.workspaceId
                                        ? "Документ увидят участники этой команды."
                                        : "Личный документ виден только тебе."
                            }
                        >
                            <MenuItem value="">Только мне</MenuItem>
                            {spaces
                                .filter((space) => space.role !== "reader")
                                .map((space) => (
                                    <MenuItem key={space.id} value={space.id}>
                                        {space.name}
                                    </MenuItem>
                                ))}
                        </TextField>
                        {error && <Alert severity="error">{error}</Alert>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button color="inherit" onClick={onClose}>
                        Отмена
                    </Button>
                    <Button variant="contained" type="submit" disabled={form.formState.isSubmitting}>
                        Создать документ
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
