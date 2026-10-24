import { z } from "zod";

export const loginSchema = z.object({
    name: z.string(),
    login: z.string(),
    email: z.string().trim().min(1, "Укажи логин или почту").max(254, "Слишком длинный логин"),
    password: z.string().min(1, "Укажи пароль").max(1024, "Не больше 1024 символов"),
    confirmation: z.string()
});
export const registrationSchema = loginSchema
    .extend({
        name: z.string().trim().min(1, "Как тебя зовут?").max(100, "Не больше 100 символов"),
        login: z
            .string()
            .trim()
            .toLowerCase()
            .regex(/^[a-z0-9][a-z0-9_-]{2,39}$/, "3–40 латинских букв, цифр, дефисов или подчёркиваний"),
        email: z.string().trim().email("Проверь адрес почты").max(254, "Не больше 254 символов"),
        password: z.string().min(12, "Не меньше 12 символов").max(1024, "Не больше 1024 символов")
    })
    .refine((values) => values.password === values.confirmation, {
        path: ["confirmation"],
        message: "Пароли не совпадают"
    });
export type AccountValues = z.infer<typeof loginSchema>;
