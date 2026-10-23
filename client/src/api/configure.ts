import { workdeskApi } from "./autogen/workdesk";
workdeskApi.enhanceEndpoints({
    endpoints: {
        connectionsSync: { invalidatesTags: ["Connections", "Tasks", "Notifications"] },
        notesSave: { invalidatesTags: ["Notes"] },
        teamInvite: { invalidatesTags: ["Team", "Notifications"] },
        teamRole: { invalidatesTags: ["Team", "Notes", "Tasks"] }
    }
});
