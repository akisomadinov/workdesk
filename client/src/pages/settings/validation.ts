import { z } from "zod";
export const telegramSchema = z
    .object({
        chatId: z.string().trim().max(100, "До 100 символов"),
        token: z
            .string()
            .trim()
            .refine((value) => !value || /^\d{4,16}:[A-Za-z0-9_-]{20,100}$/.test(value), "Проверь токен Telegram-бота"),
        enabled: z.boolean()
    })
    .refine((value) => !value.enabled || /^(@[A-Za-z0-9_]{5,}|-?\d+)$/.test(value.chatId), {
        path: ["chatId"],
        message: "Укажи числовой Chat ID или @имя канала"
    });
export type TelegramValues = z.infer<typeof telegramSchema>;
