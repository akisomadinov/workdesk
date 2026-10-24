import { workdeskApi } from "./autogen/workdesk";
workdeskApi.enhanceEndpoints({
    endpoints: {
        telegramLinkCreate: { invalidatesTags: ["TelegramLink"] },
        telegramLinkConfirm: { invalidatesTags: ["TelegramLink", "Notifications"] },
        telegramLinkCancel: { invalidatesTags: ["TelegramLink"] },
        telegramLinkDelete: { invalidatesTags: ["TelegramLink", "Notifications"] },
        connectionsSync: { invalidatesTags: ["Connections", "Tasks", "Notifications", "MergeRequests"] },
        mergeRequestsRead: { invalidatesTags: ["MergeRequests", "Notifications"] },
        mergeRequestsNotifications: { invalidatesTags: ["MergeRequests", "Notifications"] },
        notesSave: { invalidatesTags: ["Notes", "Tasks"] },
        notesDelete: { invalidatesTags: ["Notes", "Tasks"] },
        notesRestore: { invalidatesTags: ["Notes", "Tasks"] },
        teamInvite: { invalidatesTags: ["Team", "Notifications"] },
        teamAccept: { invalidatesTags: ["Team", "Notes", "Tasks", "Notifications"] },
        teamRole: { invalidatesTags: ["Team", "Notes", "Tasks"] }
    }
});
