import { lazy } from "react";
const WorkspacePage = lazy(() => import("@/pages/WorkspacePage"));
const ConnectionsPage = lazy(() => import("@/pages/ConnectionsPage"));
export const NotesPage = lazy(() => import("@/pages/NotesPage"));
const TeamPage = lazy(() => import("@/pages/TeamPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
export default function useGetPages() {
    return [
        { path: "/", label: "Сегодня", component: <WorkspacePage view="today" /> },
        { path: "/board", label: "Доска", component: <WorkspacePage view="board" /> },
        { path: "/inbox", label: "Входящие", component: <WorkspacePage view="inbox" /> },
        { path: "/archive", label: "Архив", component: <WorkspacePage view="archive" /> },
        { path: "/notes", label: "Документация", component: <NotesPage /> },
        { path: "/reports", label: "Итоги", component: <ReportsPage /> },
        { path: "/notifications", label: "Уведомления", component: <NotificationsPage /> },
        { path: "/team", label: "Команда", component: <TeamPage /> },
        { path: "/connections", label: "Подключения", component: <ConnectionsPage /> }
    ];
}
