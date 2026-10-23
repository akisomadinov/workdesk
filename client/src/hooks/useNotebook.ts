import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNotesGetQuery, useNotesSaveMutation } from "@/api/autogen/workdesk";
import type { NoteResponseRead } from "@/api/autogen/workdesk";
import useAutosave from "./useAutosave";
export const noteSchema = z.object({
    parentId: z.string(),
    title: z.string().trim().min(1, "Укажи название").max(200, "До 200 символов"),
    body: z.string().max(500000, "Заметка слишком большая"),
    project: z.string().max(200),
    tags: z.string().max(500),
    workspaceId: z.string(),
    pinned: z.boolean(),
    archived: z.boolean()
});
export type NoteValues = z.infer<typeof noteSchema>;
export function normalizeNote(note: NoteResponseRead) {
    return {
        ...note,
        id: note.id ?? "",
        title: note.title ?? "",
        body: note.body ?? "",
        project: note.project ?? "",
        tags: note.tags ?? "",
        pinned: note.pinned ?? false,
        archived: note.archived ?? false,
        revision: note.revision ?? 0,
        canEdit: note.canEdit ?? false
    };
}
export type NoteItem = ReturnType<typeof normalizeNote>;
export function useNotes() {
    const query = useNotesGetQuery(undefined, { pollingInterval: 15000 });
    return { ...query, notes: (query.data ?? []).map(normalizeNote) };
}
export default function useNoteEditor(note: NoteItem) {
    const [save] = useNotesSaveMutation();
    const form = useForm<NoteValues>({
        resolver: zodResolver(noteSchema),
        mode: "onChange",
        defaultValues: {
            parentId: note.parentId ?? "",
            title: note.title,
            body: note.body,
            project: note.project,
            tags: note.tags,
            workspaceId: note.workspaceId ?? "",
            pinned: note.pinned,
            archived: note.archived
        }
    });
    const autosave = useAutosave({
        form,
        key: `workdesk-note-draft-${note.id}`,
        revision: note.revision,
        readOnly: !note.canEdit,
        validate: (value) => {
            const result = noteSchema.safeParse(value);
            return result.success ? result.data : null;
        },
        save: async (values, revision) => {
            const result = await save({
                saveNoteRequest: {
                    ...values,
                    parentId: values.parentId || null,
                    id: note.id,
                    revision,
                    workspaceId: values.workspaceId || null
                }
            }).unwrap();
            return result.revision ?? revision + 1;
        }
    });
    return { form, ...autosave };
}
