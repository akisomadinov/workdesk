import { z } from "zod";
export const taskSchema = z.object({
    documentIds: z.array(z.string().uuid()).max(50, "До 50 документов"),
    workspaceId: z.string(),
    assigneeId: z.string(),
    milestone: z.string().max(200, "До 200 символов"),
    title: z.string().trim().min(1, "Укажи название").max(500, "До 500 символов"),
    project: z.string().max(200, "До 200 символов"),
    description: z.string().max(200000, "Описание слишком длинное"),
    notes: z.string().max(200000, "Заметки слишком длинные"),
    nextStep: z.string().max(10000, "До 10 000 символов"),
    blocker: z.string().max(10000, "До 10 000 символов"),
    stage: z.enum(["inbox", "planned", "doing", "waiting", "done"]),
    priority: z.enum(["low", "normal", "high", "urgent"]),
    plannedFor: z.string()
});
export type TaskValues = z.infer<typeof taskSchema>;
export const connectionSchema = z.object({
    projects: z.string().max(10000),
    watchMergeRequests: z.boolean(),
    name: z.string().trim().min(1, "Укажи название").max(100, "До 100 символов"),
    provider: z.enum(["gitlab", "github"]),
    apiUrl: z.url("Укажи полный адрес API"),
    requiresVpn: z.boolean(),
    token: z.string().max(4096, "Токен слишком длинный")
});
export type ConnectionValues = z.infer<typeof connectionSchema>;
