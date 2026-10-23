import { z } from "zod";
export const createTeamSchema = z.object({
    name: z.string().trim().min(1, "Укажи название команды").max(100, "До 100 символов")
});
export const invitationSchema = z
    .object({
        mode: z.enum(["login", "link"]),
        login: z
            .string()
            .trim()
            .transform((value) => value.replace(/^@/, "").toLowerCase()),
        role: z.enum(["reader", "editor"])
    })
    .refine((value) => value.mode !== "login" || /^[a-z0-9][a-z0-9_-]{2,39}$/.test(value.login), {
        message: "Укажи логин: 3–40 латинских букв, цифр, дефисов или подчёркиваний",
        path: ["login"]
    });
export type InvitationValues = z.infer<typeof invitationSchema>;
