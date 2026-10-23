import { useState } from "react";
import useAutosave from "./useAutosave";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTasksSaveMutation } from "@/api/autogen/workdesk";
import { message, taskRequest } from "@/common/models";
import type { TaskItem } from "@/common/models";
import { taskSchema } from "@/pages/validation";
import type { TaskValues } from "@/pages/validation";

function defaults(task: TaskItem): TaskValues {
    return {
        workspaceId: task.workspaceId ?? "",
        assigneeId: task.assigneeId ?? "",
        milestone: task.milestone ?? "",
        title: task.title,
        project: task.project,
        description: task.description,
        notes: task.notes,
        documentIds: task.documentIds,
        nextStep: task.nextStep,
        blocker: task.blocker,
        stage: task.stage as TaskValues["stage"],
        priority: task.priority as TaskValues["priority"],
        plannedFor: task.plannedFor ?? ""
    };
}
export default function useTaskEditor(task: TaskItem) {
    const form = useForm<TaskValues>({
        resolver: zodResolver(taskSchema),
        mode: "onChange",
        defaultValues: defaults(task)
    });
    const [save] = useTasksSaveMutation();
    const [archiveError, setArchiveError] = useState("");
    const request = (values: TaskValues, revision: number) => ({
        ...taskRequest(task),
        ...values,
        revision,
        workspaceId: values.workspaceId || null,
        assigneeId: values.assigneeId || null,
        plannedFor: values.plannedFor || null
    });
    const autosave = useAutosave({
        form,
        key: `workdesk-draft-${task.id}`,
        revision: task.revision,
        readOnly: task.canEdit === false,
        validate: (value) => {
            // Drafts from previous versions do not contain document links.
            const result = taskSchema.safeParse(
                typeof value === "object" && value !== null ? { documentIds: task.documentIds, ...value } : value
            );
            return result.success ? result.data : null;
        },
        save: async (values, revision) => {
            const result = await save({ saveTaskRequest: request(values, revision) }).unwrap();
            const removed = values.documentIds.filter((id) => !(result.documentIds ?? []).includes(id));
            if (removed.length)
                form.setValue(
                    "documentIds",
                    form.getValues("documentIds").filter((id) => !removed.includes(id)),
                    { shouldDirty: true }
                );
            return result.revision ?? revision + 1;
        }
    });
    async function archive() {
        if (task.canEdit === false || !(await autosave.flush())) return false;
        try {
            await save({
                saveTaskRequest: { ...request(form.getValues(), autosave.revision.current), archived: !task.archived }
            }).unwrap();
            return true;
        } catch (failure) {
            setArchiveError(message(failure));
            return false;
        }
    }
    return { form, ...autosave, error: autosave.error || archiveError, archive };
}
