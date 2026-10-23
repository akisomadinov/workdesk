import type { TaskItem } from "@/common/models";
const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
export function isOverdue(task: TaskItem, today: string) {
    return task.stage !== "done" && !!task.plannedFor && task.plannedFor < today;
}
export function planDate(value: string) {
    return new Date(`${value}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
export function buildToday(tasks: TaskItem[], today: string) {
    const active = tasks.filter((task) => !task.archived && !task.deletedAt);
    const eligible = active.filter(
        (task) =>
            task.stage !== "waiting" &&
            task.stage !== "done" &&
            (task.plannedFor === today || isOverdue(task, today) || (task.stage === "doing" && !task.plannedFor))
    );
    eligible.sort(
        (a, b) =>
            (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2) ||
            Number(isOverdue(b, today)) - Number(isOverdue(a, today)) ||
            Number(b.stage === "doing") - Number(a.stage === "doing") ||
            (a.plannedFor || today).localeCompare(b.plannedFor || today) ||
            (a.created ?? "").localeCompare(b.created ?? "") ||
            a.id.localeCompare(b.id)
    );
    const first = eligible[0] ?? null;
    const rest = eligible.slice(1);
    return {
        first,
        overdue: rest.filter((task) => isOverdue(task, today)),
        planned: rest.filter((task) => !isOverdue(task, today)),
        waiting: active
            .filter((task) => task.stage === "waiting")
            .sort(
                (a, b) =>
                    Number(isOverdue(b, today)) - Number(isOverdue(a, today)) ||
                    (a.plannedFor || "9999").localeCompare(b.plannedFor || "9999") ||
                    (a.modified ?? a.created ?? "").localeCompare(b.modified ?? b.created ?? "") ||
                    a.id.localeCompare(b.id)
            ),
        done: active.filter((task) => task.stage === "done" && task.plannedFor === today)
    };
}
export function firstReason(task: TaskItem, today: string) {
    const reasons: string[] = [];
    if (task.priority === "urgent") reasons.push("Срочно");
    else if (task.priority === "high") reasons.push("Высокий приоритет");
    if (isOverdue(task, today)) reasons.push(`Просрочено · план на ${planDate(task.plannedFor!)}`);
    else if (task.stage === "doing") reasons.push("Уже в работе");
    else reasons.push("В плане на сегодня");
    return reasons.join(" · ");
}
