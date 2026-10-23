import type {
    WorkItemResponseRead as WorkItemResponse,
    ConnectionResponseRead as ConnectionResponse
} from "@/api/autogen/workdesk";
export const stages = [
    { id: "inbox", label: "Входящие" },
    { id: "planned", label: "Запланировано" },
    { id: "doing", label: "В работе" },
    { id: "waiting", label: "Ожидаю" },
    { id: "done", label: "Готово" }
];
export const priorities = [
    { id: "low", label: "Низкий" },
    { id: "normal", label: "Обычный" },
    { id: "high", label: "Высокий" },
    { id: "urgent", label: "Срочно" }
];
export function taskCount(count: number) {
    const end = count % 100;
    const word =
        end >= 11 && end <= 14
            ? "задач"
            : count % 10 === 1
              ? "задача"
              : count % 10 >= 2 && count % 10 <= 4
                ? "задачи"
                : "задач";
    return `${count} ${word}`;
}
export function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export type TaskItem = ReturnType<typeof normalizeTask>;
export function normalizeTask(item: WorkItemResponse) {
    return {
        ...item,
        id: item.id ?? "",
        title: item.title ?? "",
        project: item.project ?? "",
        description: item.description ?? "",
        notes: item.notes ?? "",
        documentIds: item.documentIds ?? [],
        nextStep: item.nextStep ?? "",
        blocker: item.blocker ?? "",
        stage: item.stage ?? "inbox",
        priority: item.priority ?? "normal",
        revision: item.revision ?? 0,
        archived: item.archived ?? false,
        plannedFor: item.plannedFor ?? null
    };
}
export function taskRequest(task: TaskItem) {
    return {
        id: task.id,
        workspaceId: task.workspaceId ?? null,
        assigneeId: task.assigneeId ?? null,
        milestone: task.milestone ?? "",
        revision: task.revision,
        title: task.title,
        project: task.project,
        description: task.description,
        notes: task.notes,
        documentIds: task.documentIds,
        nextStep: task.nextStep,
        blocker: task.blocker,
        stage: task.stage,
        priority: task.priority,
        plannedFor: task.plannedFor,
        archived: task.archived
    };
}
export function message(error: unknown): string {
    if (typeof error === "object" && error !== null && "data" in error) {
        const data: unknown = error.data;
        if (typeof data === "object" && data !== null && "title" in data && typeof data.title === "string")
            return data.title;
    }
    return "Не удалось связаться с приложением. Проверь, что Workdesk запущен, и повтори попытку.";
}
export function sourceLabel(id: string | null | undefined, connections: ConnectionResponse[]) {
    return connections.find((x) => x.id === id)?.name ?? "Личная задача";
}
export function dateTime(value: string | null | undefined) {
    return value
        ? new Date(value).toLocaleString("ru-RU", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit"
          })
        : "Ещё не было";
}
export function safeLink(value: string | null | undefined) {
    try {
        const url = new URL(value ?? "");
        return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
    } catch {
        return undefined;
    }
}
