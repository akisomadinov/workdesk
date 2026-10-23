import { useAuthSessionQuery, useTeamGetQuery } from "@/api/autogen/workdesk";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import useTasks from "./useTasks";
export default function useTaskWorkspace() {
    const result = useTasks();
    const { scope } = useWorkspaceStore();
    const { data: session } = useAuthSessionQuery();
    const { data: spaces = [] } = useTeamGetQuery();
    return {
        ...result,
        scoped: result.tasks.filter(
            (task) =>
                scope === "all" ||
                (scope === "mine"
                    ? !task.workspaceId || task.assigneeId === session?.userId
                    : task.workspaceId === scope)
        ),
        canCreate:
            ["mine", "all"].includes(scope) || spaces.some((space) => space.id === scope && space.role !== "reader")
    };
}
