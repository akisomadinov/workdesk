import { useEffect, useRef, useState } from "react";
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
    const [status, setStatus] = useState("Сохранено");
    const [error, setError] = useState("");
    const [recovery, setRecovery] = useState<TaskValues | null>(null);
    const [hasDraft, setHasDraft] = useState(false);
    const revision = useRef(task.revision);
    const saved = useRef(JSON.stringify(defaults(task)));
    const running = useRef<Promise<boolean> | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const blocked = useRef(false);
    const key = `workdesk-draft-${task.id}`;
    const flushRef = useRef<() => Promise<boolean>>(async () => true);

    async function flush(): Promise<boolean> {
        clearTimeout(timer.current);
        if (running.current) return running.current;
        if (blocked.current) return false;
        const persist = async () => {
            while (true) {
                const values = form.getValues();
                const serialized = JSON.stringify(values);
                if (serialized === saved.current) {
                    setStatus("Сохранено");
                    return true;
                }
                if (!taskSchema.safeParse(values).success) {
                    setStatus("Проверь поля");
                    return false;
                }
                setStatus("Сохраняем…");
                try {
                    const response = await save({
                        saveTaskRequest: {
                            ...taskRequest(task),
                            ...values,
                            workspaceId: values.workspaceId || null,
                            assigneeId: values.assigneeId || null,
                            revision: revision.current,
                            plannedFor: values.plannedFor || null
                        }
                    }).unwrap();
                    revision.current = response.revision ?? revision.current + 1;
                    saved.current = serialized;
                    setError("");
                    if (JSON.stringify(form.getValues()) === serialized) {
                        try {
                            localStorage.removeItem(key);
                        } catch {
                            /* The server already confirmed durable persistence. */
                        }
                        setHasDraft(false);
                        setStatus("Сохранено");
                        return true;
                    }
                } catch (failure) {
                    setError(message(failure));
                    setStatus("Есть несохранённые изменения");
                    if (
                        typeof failure === "object" &&
                        failure !== null &&
                        "status" in failure &&
                        failure.status === 409
                    )
                        blocked.current = true;
                    return false;
                }
            }
        };
        const promise = persist();
        running.current = promise;
        try {
            return await promise;
        } finally {
            running.current = null;
        }
    }
    flushRef.current = flush;
    useEffect(() => {
        try {
            const raw = localStorage.getItem(key);
            if (raw) {
                const parsed: unknown = JSON.parse(raw);
                const recovered = taskSchema.safeParse(parsed);
                if (recovered.success && JSON.stringify(recovered.data) !== saved.current) setRecovery(recovered.data);
            }
        } catch {
            /* A damaged draft never prevents opening the saved task. */
        }
        const subscription = form.watch((value) => {
            if (JSON.stringify(value) === saved.current) return;
            try {
                localStorage.setItem(key, JSON.stringify(value));
                setHasDraft(true);
            } catch {
                setHasDraft(false);
                setError("Не удалось сохранить черновик в браузере. Не закрывай карточку до записи в базу.");
            }
            setStatus("Есть изменения");
            clearTimeout(timer.current);
            timer.current = setTimeout(() => {
                void flushRef.current();
            }, 700);
        });
        const beforeUnload = (event: BeforeUnloadEvent) => {
            if (JSON.stringify(form.getValues()) !== saved.current) {
                event.preventDefault();
                event.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", beforeUnload);
        return () => {
            subscription.unsubscribe();
            clearTimeout(timer.current);
            window.removeEventListener("beforeunload", beforeUnload);
        };
    }, [form, key]);
    async function archive() {
        if (!(await flush())) return false;
        try {
            await save({
                saveTaskRequest: {
                    ...taskRequest(task),
                    ...form.getValues(),
                    workspaceId: form.getValues("workspaceId") || null,
                    assigneeId: form.getValues("assigneeId") || null,
                    plannedFor: form.getValues("plannedFor") || null,
                    revision: revision.current,
                    archived: !task.archived
                }
            }).unwrap();
            return true;
        } catch (failure) {
            setError(message(failure));
            return false;
        }
    }
    return {
        form,
        status,
        error,
        recovery,
        hasDraft,
        flush,
        archive,
        recover: () => {
            if (recovery) form.reset(recovery);
            setRecovery(null);
        },
        discardRecovery: () => {
            try {
                localStorage.removeItem(key);
            } catch {
                /* Ignore disabled browser storage. */
            }
            setRecovery(null);
        }
    };
}
