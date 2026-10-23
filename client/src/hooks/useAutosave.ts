import { useEffect, useRef, useState } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { message } from "@/common/models";
interface Options<T extends FieldValues> {
    form: UseFormReturn<T>;
    key: string;
    revision: number;
    validate: (values: unknown) => T | null;
    save: (values: T, revision: number) => Promise<number>;
    readOnly?: boolean;
}
export default function useAutosave<T extends FieldValues>({
    form,
    key,
    revision: initial,
    validate,
    save,
    readOnly = false
}: Options<T>) {
    const [status, setStatus] = useState(readOnly ? "Только чтение" : "Сохранено");
    const [error, setError] = useState("");
    const [recovery, setRecovery] = useState<T | null>(null);
    const [hasDraft, setHasDraft] = useState(false);
    const revision = useRef(initial);
    const saved = useRef(JSON.stringify(form.getValues()));
    const running = useRef<Promise<boolean> | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const blocked = useRef(false);
    const flushRef = useRef<() => Promise<boolean>>(async () => true);
    async function flush(): Promise<boolean> {
        clearTimeout(timer.current);
        if (readOnly) return true;
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
                if (!validate(values)) {
                    setStatus("Проверь поля");
                    return false;
                }
                setStatus("Сохраняем…");
                try {
                    revision.current = await save(values, revision.current);
                    saved.current = serialized;
                    setError("");
                    if (JSON.stringify(form.getValues()) === serialized) {
                        try {
                            localStorage.removeItem(key);
                        } catch {
                            /* The database already confirmed persistence. */
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
        if (readOnly) return;
        try {
            const raw = localStorage.getItem(key);
            const draft = raw ? validate(JSON.parse(raw)) : null;
            if (draft && JSON.stringify(draft) !== saved.current) setRecovery(draft);
        } catch {
            /* Ignore damaged browser drafts. */
        }
        const subscription = form.watch((value) => {
            if (JSON.stringify(value) === saved.current) return;
            try {
                localStorage.setItem(key, JSON.stringify(value));
                setHasDraft(true);
            } catch {
                setError("Не удалось сохранить черновик в браузере. Дождись записи в базу.");
                setHasDraft(false);
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
            void flushRef.current();
        };
    }, [form, key, readOnly]);
    return {
        status,
        error,
        recovery,
        hasDraft,
        flush,
        revision,
        recover: () => {
            if (recovery) form.reset(recovery);
            setRecovery(null);
        },
        discardRecovery: () => {
            try {
                localStorage.removeItem(key);
            } catch {
                /* Browser storage may be disabled. */
            }
            setRecovery(null);
        }
    };
}
