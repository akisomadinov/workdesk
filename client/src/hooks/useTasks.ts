import { useTasksGetQuery, useConnectionsGetQuery, useTasksSaveMutation } from "@/api/autogen/workdesk";
import { normalizeTask, taskRequest } from "@/common/models";
import type { TaskItem } from "@/common/models";
export default function useTasks() {
    const query = useTasksGetQuery(undefined, { pollingInterval: 20000, refetchOnFocus: true });
    const connections = useConnectionsGetQuery(undefined, { pollingInterval: 15000 });
    const [save] = useTasksSaveMutation();
    async function update(task: TaskItem, change: Partial<TaskItem>) {
        return save({ saveTaskRequest: taskRequest({ ...task, ...change }) }).unwrap();
    }
    return { ...query, tasks: (query.data ?? []).map(normalizeTask), connections: connections.data ?? [], update };
}
