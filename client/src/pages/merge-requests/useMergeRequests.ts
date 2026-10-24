import { useState } from "react";
import {
    useConnectionsGetQuery,
    useConnectionsSyncMutation,
    useMergeRequestsNotificationsMutation
} from "@/api/autogen/workdesk";
import { message } from "@/common/models";

export default function useMergeRequests() {
    const { data: connections = [] } = useConnectionsGetQuery(undefined, { pollingInterval: 30000 });
    const [sync] = useConnectionsSyncMutation();
    const [notify, notifyStatus] = useMergeRequestsNotificationsMutation();
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const watched = connections.filter((item) => item.watchMergeRequests);
    const available = watched.filter((item) => item.enabled && item.hasToken);
    async function refresh() {
        setRefreshing(true);
        setError("");
        const results = await Promise.allSettled(available.map((item) => sync({ id: item.id ?? "" }).unwrap()));
        const problems = results.flatMap((result) =>
            result.status === "rejected"
                ? [message(result.reason)]
                : result.value.health !== "ok"
                  ? [`${result.value.name}: ${result.value.message}`]
                  : []
        );
        setError(problems.join(" "));
        setRefreshing(false);
    }
    async function setNotifications(id: string, enabled: boolean) {
        setError("");
        try {
            await notify({ id, setEnabledRequest: { enabled } }).unwrap();
        } catch (problem) {
            setError(message(problem));
        }
    }
    return {
        connections,
        watched,
        canRefresh: available.length > 0,
        refreshing,
        refresh,
        setNotifications,
        notificationPending: notifyStatus.isLoading,
        error,
        setError
    };
}
