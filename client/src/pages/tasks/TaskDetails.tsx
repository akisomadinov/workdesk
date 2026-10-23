import { lazy, Suspense, useEffect } from "react";
import { LinearProgress } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import type { TaskItem } from "@/common/models";
import { useUiStore } from "@/stores/useUiStore";
const TaskDrawer = lazy(() => import("../TaskDrawer"));
export default function TaskDetails({ tasks }: { tasks: TaskItem[] }) {
    const { selected, select } = useUiStore();
    const [params, setParams] = useSearchParams();
    useEffect(() => {
        const id = params.get("task");
        if (id) select(id);
    }, [params, select]);
    const task = tasks.find((item) => item.id === selected);
    return task ? (
        <Suspense fallback={<LinearProgress aria-label="Открываем карточку" />}>
            <TaskDrawer
                key={task.id}
                task={task}
                onClose={() => {
                    select(null);
                    if (params.has("task")) {
                        const next = new URLSearchParams(params);
                        next.delete("task");
                        setParams(next, { replace: true });
                    }
                }}
            />
        </Suspense>
    ) : null;
}
