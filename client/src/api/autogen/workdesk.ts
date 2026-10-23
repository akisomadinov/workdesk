import { api } from "../api";
export const addTagTypes = [
    "Auth",
    "Connections",
    "Notes",
    "Notifications",
    "Tasks",
    "Team",
    "Workdesk.Server",
] as const;
const injectedRtkApi = api
    .enhanceEndpoints({
        addTagTypes,
    })
    .injectEndpoints({
        endpoints: (build) => ({
            authSession: build.query<AuthSessionResponse, AuthSessionRequest>({
                query: () => ({ url: `/api/Auth/session` }),
                providesTags: ["Auth"],
            }),
            authSetup: build.mutation<AuthSetupResponse, AuthSetupRequest>({
                query: (queryArg) => ({
                    url: `/api/Auth/setup`,
                    method: "POST",
                    body: queryArg.credentialsRequest,
                }),
                invalidatesTags: ["Auth"],
            }),
            authLogin: build.mutation<AuthLoginResponse, AuthLoginRequest>({
                query: (queryArg) => ({
                    url: `/api/Auth/login`,
                    method: "POST",
                    body: queryArg.credentialsRequest,
                }),
                invalidatesTags: ["Auth"],
            }),
            authAccept: build.mutation<AuthAcceptResponse, AuthAcceptRequest>({
                query: (queryArg) => ({
                    url: `/api/Auth/accept`,
                    method: "POST",
                    body: queryArg.acceptInvitationRequest,
                }),
                invalidatesTags: ["Auth"],
            }),
            authLogout: build.mutation<AuthLogoutResponse, AuthLogoutRequest>({
                query: () => ({ url: `/api/Auth/logout`, method: "POST" }),
                invalidatesTags: ["Auth"],
            }),
            connectionsGet: build.query<
                ConnectionsGetResponse,
                ConnectionsGetRequest
            >({
                query: () => ({ url: `/api/Connections` }),
                providesTags: ["Connections"],
            }),
            connectionsCreate: build.mutation<
                ConnectionsCreateResponse,
                ConnectionsCreateRequest
            >({
                query: (queryArg) => ({
                    url: `/api/Connections/save`,
                    method: "POST",
                    body: queryArg.createConnectionRequest,
                }),
                invalidatesTags: ["Connections"],
            }),
            connectionsToken: build.mutation<
                ConnectionsTokenResponse,
                ConnectionsTokenRequest
            >({
                query: (queryArg) => ({
                    url: `/api/Connections/${queryArg.id}/token`,
                    method: "POST",
                    body: queryArg.setTokenRequest,
                }),
                invalidatesTags: ["Connections"],
            }),
            connectionsEnable: build.mutation<
                ConnectionsEnableResponse,
                ConnectionsEnableRequest
            >({
                query: (queryArg) => ({
                    url: `/api/Connections/${queryArg.id}/enabled`,
                    method: "POST",
                    body: queryArg.setEnabledRequest,
                }),
                invalidatesTags: ["Connections"],
            }),
            connectionsScope: build.mutation<
                ConnectionsScopeResponse,
                ConnectionsScopeRequest
            >({
                query: (queryArg) => ({
                    url: `/api/Connections/${queryArg.id}/scope`,
                    method: "POST",
                    body: queryArg.setScopeRequest,
                }),
                invalidatesTags: ["Connections"],
            }),
            connectionsSync: build.mutation<
                ConnectionsSyncResponse,
                ConnectionsSyncRequest
            >({
                query: (queryArg) => ({
                    url: `/api/Connections/${queryArg.id}/sync`,
                    method: "POST",
                }),
                invalidatesTags: ["Connections"],
            }),
            notesGet: build.query<NotesGetResponse, NotesGetRequest>({
                query: () => ({ url: `/api/Notes` }),
                providesTags: ["Notes"],
            }),
            notesSave: build.mutation<NotesSaveResponse, NotesSaveRequest>({
                query: (queryArg) => ({
                    url: `/api/Notes/save`,
                    method: "POST",
                    body: queryArg.saveNoteRequest,
                }),
                invalidatesTags: ["Notes"],
            }),
            notesHistory: build.query<
                NotesHistoryResponse,
                NotesHistoryRequest
            >({
                query: (queryArg) => ({
                    url: `/api/Notes/${queryArg.id}/history`,
                }),
                providesTags: ["Notes"],
            }),
            notesImport: build.mutation<
                NotesImportResponse,
                NotesImportRequest
            >({
                query: (queryArg) => ({
                    url: `/api/Notes/import`,
                    method: "POST",
                    body: queryArg.importNotesRequest,
                }),
                invalidatesTags: ["Notes"],
            }),
            notesExport: build.query<NotesExportResponse, NotesExportRequest>({
                query: () => ({ url: `/api/Notes/export` }),
                providesTags: ["Notes"],
            }),
            notificationsGet: build.query<
                NotificationsGetResponse,
                NotificationsGetRequest
            >({
                query: () => ({ url: `/api/Notifications` }),
                providesTags: ["Notifications"],
            }),
            notificationsRead: build.mutation<
                NotificationsReadResponse,
                NotificationsReadRequest
            >({
                query: (queryArg) => ({
                    url: `/api/Notifications/${queryArg.id}/read`,
                    method: "POST",
                }),
                invalidatesTags: ["Notifications"],
            }),
            notificationsTelegram: build.query<
                NotificationsTelegramResponse,
                NotificationsTelegramRequest
            >({
                query: () => ({ url: `/api/Notifications/telegram` }),
                providesTags: ["Notifications"],
            }),
            notificationsConfigure: build.mutation<
                NotificationsConfigureResponse,
                NotificationsConfigureRequest
            >({
                query: (queryArg) => ({
                    url: `/api/Notifications/telegram`,
                    method: "POST",
                    body: queryArg.saveTelegramRequest,
                }),
                invalidatesTags: ["Notifications"],
            }),
            tasksGet: build.query<TasksGetResponse, TasksGetRequest>({
                query: () => ({ url: `/api/Tasks` }),
                providesTags: ["Tasks"],
            }),
            tasksSave: build.mutation<TasksSaveResponse, TasksSaveRequest>({
                query: (queryArg) => ({
                    url: `/api/Tasks/save`,
                    method: "POST",
                    body: queryArg.saveTaskRequest,
                }),
                invalidatesTags: ["Tasks"],
            }),
            teamGet: build.query<TeamGetResponse, TeamGetRequest>({
                query: () => ({ url: `/api/Team` }),
                providesTags: ["Team"],
            }),
            teamCreate: build.mutation<TeamCreateResponse, TeamCreateRequest>({
                query: (queryArg) => ({
                    url: `/api/Team/save`,
                    method: "POST",
                    body: queryArg.createWorkspaceRequest,
                }),
                invalidatesTags: ["Team"],
            }),
            teamInvite: build.mutation<TeamInviteResponse, TeamInviteRequest>({
                query: (queryArg) => ({
                    url: `/api/Team/${queryArg.id}/invite`,
                    method: "POST",
                    body: queryArg.inviteRequest,
                }),
                invalidatesTags: ["Team"],
            }),
            teamPending: build.query<TeamPendingResponse, TeamPendingRequest>({
                query: () => ({ url: `/api/Team/invitations` }),
                providesTags: ["Team"],
            }),
            teamAccept: build.mutation<TeamAcceptResponse, TeamAcceptRequest>({
                query: (queryArg) => ({
                    url: `/api/Team/invitations/${queryArg.id}/accept`,
                    method: "POST",
                }),
                invalidatesTags: ["Team"],
            }),
            teamRole: build.mutation<TeamRoleResponse, TeamRoleRequest>({
                query: (queryArg) => ({
                    url: `/api/Team/${queryArg.id}/members/${queryArg.user}`,
                    method: "POST",
                    body: queryArg.roleRequest,
                }),
                invalidatesTags: ["Team"],
            }),
            appapihealth: build.query<
                AppapihealthResponse,
                AppapihealthRequest
            >({
                query: () => ({ url: `/api/health` }),
                providesTags: ["Workdesk.Server"],
            }),
            appapibackup: build.query<
                AppapibackupResponse,
                AppapibackupRequest
            >({
                query: () => ({ url: `/api/backup` }),
                providesTags: ["Workdesk.Server"],
            }),
        }),
        overrideExisting: false,
    });
export { injectedRtkApi as workdeskApi };
export type AuthSessionResponse = /** status 200 OK */ SessionResponse;
export type AuthSessionRequest = void;
export type AuthSetupResponse = /** status 200 OK */ SessionResponse;
export type AuthSetupRequest = {
    credentialsRequest: CredentialsRequest;
};
export type AuthLoginResponse = /** status 200 OK */ SessionResponse;
export type AuthLoginRequest = {
    credentialsRequest: CredentialsRequest;
};
export type AuthAcceptResponse = /** status 200 OK */ SessionResponse;
export type AuthAcceptRequest = {
    acceptInvitationRequest: AcceptInvitationRequest;
};
export type AuthLogoutResponse = unknown;
export type AuthLogoutRequest = void;
export type ConnectionsGetResponse =
    /** status 200 OK */ ConnectionResponseRead[];
export type ConnectionsGetRequest = void;
export type ConnectionsCreateResponse =
    /** status 200 OK */ ConnectionResponseRead;
export type ConnectionsCreateRequest = {
    createConnectionRequest: CreateConnectionRequest;
};
export type ConnectionsTokenResponse =
    /** status 200 OK */ ConnectionResponseRead;
export type ConnectionsTokenRequest = {
    id: string;
    setTokenRequest: SetTokenRequest;
};
export type ConnectionsEnableResponse =
    /** status 200 OK */ ConnectionResponseRead;
export type ConnectionsEnableRequest = {
    id: string;
    setEnabledRequest: SetEnabledRequest;
};
export type ConnectionsScopeResponse =
    /** status 200 OK */ ConnectionResponseRead;
export type ConnectionsScopeRequest = {
    id: string;
    setScopeRequest: SetScopeRequest;
};
export type ConnectionsSyncResponse =
    /** status 200 OK */ ConnectionResponseRead;
export type ConnectionsSyncRequest = {
    id: string;
};
export type NotesGetResponse = /** status 200 OK */ NoteResponseRead[];
export type NotesGetRequest = void;
export type NotesSaveResponse = /** status 200 OK */ NoteResponseRead;
export type NotesSaveRequest = {
    saveNoteRequest: SaveNoteRequest;
};
export type NotesHistoryResponse = /** status 200 OK */ NoteHistoryResponse[];
export type NotesHistoryRequest = {
    id: string;
};
export type NotesImportResponse = /** status 200 OK */ NoteResponseRead[];
export type NotesImportRequest = {
    importNotesRequest: ImportNotesRequest;
};
export type NotesExportResponse = unknown;
export type NotesExportRequest = void;
export type NotificationsGetResponse =
    /** status 200 OK */ NotificationResponse[];
export type NotificationsGetRequest = void;
export type NotificationsReadResponse = unknown;
export type NotificationsReadRequest = {
    id: string;
};
export type NotificationsTelegramResponse =
    /** status 200 OK */ TelegramResponse;
export type NotificationsTelegramRequest = void;
export type NotificationsConfigureResponse =
    /** status 200 OK */ TelegramResponse;
export type NotificationsConfigureRequest = {
    saveTelegramRequest: SaveTelegramRequest;
};
export type TasksGetResponse = /** status 200 OK */ WorkItemResponseRead[];
export type TasksGetRequest = void;
export type TasksSaveResponse = /** status 200 OK */ WorkItemResponseRead;
export type TasksSaveRequest = {
    saveTaskRequest: SaveTaskRequest;
};
export type TeamGetResponse = /** status 200 OK */ WorkspaceResponse[];
export type TeamGetRequest = void;
export type TeamCreateResponse = /** status 200 OK */ WorkspaceResponse;
export type TeamCreateRequest = {
    createWorkspaceRequest: CreateWorkspaceRequest;
};
export type TeamInviteResponse = /** status 200 OK */ InvitationResponse;
export type TeamInviteRequest = {
    id: string;
    inviteRequest: InviteRequest;
};
export type TeamPendingResponse =
    /** status 200 OK */ PendingInvitationResponse[];
export type TeamPendingRequest = void;
export type TeamAcceptResponse = unknown;
export type TeamAcceptRequest = {
    id: string;
};
export type TeamRoleResponse = unknown;
export type TeamRoleRequest = {
    id: string;
    user: string;
    roleRequest: RoleRequest;
};
export type AppapihealthResponse =
    /** status 200 OK */ StringString3C3EfAnonymousType0;
export type AppapihealthRequest = void;
export type AppapibackupResponse = unknown;
export type AppapibackupRequest = void;
export type SessionResponse = {
    userId?: string;
    name?: string | null;
    authenticated?: boolean;
    setupRequired?: boolean;
    sharedMode?: boolean;
    login?: string | null;
};
export type CredentialsRequest = {
    login?: string | null;
    name?: string | null;
    email?: string | null;
    password?: string | null;
};
export type AcceptInvitationRequest = {
    login?: string | null;
    token?: string | null;
    name?: string | null;
    email?: string | null;
    password?: string | null;
};
export type ConnectionResponse = {
    hasToken?: boolean;
};
export type ConnectionResponseRead = {
    projects?: string | null;
    watchMergeRequests?: boolean;
    id?: string;
    name?: string | null;
    provider?: string | null;
    apiUrl?: string | null;
    requiresVpn?: boolean;
    enabled?: boolean;
    health?: string | null;
    message?: string | null;
    lastAttempt?: string | null;
    lastSuccess?: string | null;
    importedCount?: number;
    hasToken?: boolean;
};
export type CreateConnectionRequest = {
    projects?: string | null;
    watchMergeRequests?: boolean;
    name?: string | null;
    provider?: string | null;
    apiUrl?: string | null;
    requiresVpn?: boolean;
    token?: string | null;
};
export type SetTokenRequest = {
    token?: string | null;
};
export type SetEnabledRequest = {
    enabled?: boolean;
};
export type SetScopeRequest = {
    projects?: string | null;
    watchMergeRequests?: boolean;
};
export type NoteResponse = {
    canEdit?: boolean;
};
export type NoteResponseRead = {
    id?: string;
    parentId?: string | null;
    ownerId?: string;
    workspaceId?: string | null;
    title?: string | null;
    body?: string | null;
    project?: string | null;
    tags?: string | null;
    pinned?: boolean;
    archived?: boolean;
    revision?: number;
    created?: string;
    modified?: string | null;
    canEdit?: boolean;
};
export type SaveNoteRequest = {
    parentId?: string | null;
    id?: string | null;
    revision?: number;
    workspaceId?: string | null;
    title?: string | null;
    body?: string | null;
    project?: string | null;
    tags?: string | null;
    pinned?: boolean;
    archived?: boolean;
};
export type NoteHistoryResponse = {
    id?: string;
    title?: string | null;
    body?: string | null;
    number?: number;
    authorId?: string;
    created?: string;
};
export type MarkdownFileRequest = {
    name?: string | null;
    content?: string | null;
};
export type ImportNotesRequest = {
    workspaceId?: string | null;
    files?: MarkdownFileRequest[] | null;
};
export type NotificationResponse = {
    id?: string;
    title?: string | null;
    url?: string | null;
    kind?: string | null;
    read?: boolean;
    delivery?: string | null;
    created?: string;
};
export type TelegramResponse = {
    chatId?: string | null;
    enabled?: boolean;
    hasToken?: boolean;
};
export type SaveTelegramRequest = {
    chatId?: string | null;
    token?: string | null;
    enabled?: boolean;
};
export type WorkItemResponse = {
    canEdit?: boolean;
    documentIds?: string[] | null;
};
export type WorkItemResponseRead = {
    ownerId?: string;
    workspaceId?: string | null;
    assigneeId?: string | null;
    milestone?: string | null;
    externalMilestone?: string | null;
    canEdit?: boolean;
    id?: string;
    title?: string | null;
    project?: string | null;
    description?: string | null;
    notes?: string | null;
    documentIds?: string[] | null;
    nextStep?: string | null;
    blocker?: string | null;
    stage?: string | null;
    priority?: string | null;
    plannedFor?: string | null;
    archived?: boolean;
    revision?: number;
    connectionId?: string | null;
    externalKey?: string | null;
    externalUrl?: string | null;
    externalState?: string | null;
    created?: string;
    modified?: string | null;
    sourceUpdated?: string | null;
};
export type SaveTaskRequest = {
    workspaceId?: string | null;
    assigneeId?: string | null;
    milestone?: string | null;
    id?: string | null;
    revision?: number;
    title?: string | null;
    project?: string | null;
    description?: string | null;
    notes?: string | null;
    documentIds?: string[] | null;
    nextStep?: string | null;
    blocker?: string | null;
    stage?: string | null;
    priority?: string | null;
    plannedFor?: string | null;
    archived?: boolean;
};
export type PersonResponse = {
    id?: string;
    name?: string | null;
    role?: string | null;
};
export type WorkspaceResponse = {
    id?: string;
    name?: string | null;
    role?: string | null;
    members?: PersonResponse[] | null;
};
export type CreateWorkspaceRequest = {
    name?: string | null;
};
export type InvitationResponse = {
    token?: string | null;
    expires?: string;
    workspace?: string | null;
    role?: string | null;
};
export type InviteRequest = {
    login?: string | null;
    role?: string | null;
};
export type PendingInvitationResponse = {
    id?: string;
    workspace?: string | null;
    role?: string | null;
    expires?: string;
};
export type RoleRequest = {
    role?: string | null;
};
export type StringString3C3EfAnonymousType0 = {
    status?: string | null;
    version?: string | null;
};
export const {
    useAuthSessionQuery,
    useAuthSetupMutation,
    useAuthLoginMutation,
    useAuthAcceptMutation,
    useAuthLogoutMutation,
    useConnectionsGetQuery,
    useConnectionsCreateMutation,
    useConnectionsTokenMutation,
    useConnectionsEnableMutation,
    useConnectionsScopeMutation,
    useConnectionsSyncMutation,
    useNotesGetQuery,
    useNotesSaveMutation,
    useNotesHistoryQuery,
    useNotesImportMutation,
    useNotesExportQuery,
    useNotificationsGetQuery,
    useNotificationsReadMutation,
    useNotificationsTelegramQuery,
    useNotificationsConfigureMutation,
    useTasksGetQuery,
    useTasksSaveMutation,
    useTeamGetQuery,
    useTeamCreateMutation,
    useTeamInviteMutation,
    useTeamPendingQuery,
    useTeamAcceptMutation,
    useTeamRoleMutation,
    useAppapihealthQuery,
    useAppapibackupQuery,
} = injectedRtkApi;
