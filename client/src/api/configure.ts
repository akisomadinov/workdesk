import { workdeskApi } from "./autogen/workdesk";
workdeskApi.enhanceEndpoints({
    endpoints: {
        connectionsSync: { invalidatesTags: ["Connections", "Tasks", "Notifications"] },
        notesSave: { invalidatesTags: ["Notes", "Tasks"] },
        notesDelete: { invalidatesTags: ["Notes", "Tasks"] },
        notesRestore: { invalidatesTags: ["Notes", "Tasks"] },
        teamInvite: { invalidatesTags: ["Team", "Notifications"] },
        teamRole: { invalidatesTags: ["Team", "Notes", "Tasks"] }
    }
});
