import { useState } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useAuthSetupMutation, useAuthLoginMutation, useAuthAcceptMutation } from "@/api/autogen/workdesk";
import { api } from "@/api/api";
import { store } from "@/app/store";
import { message } from "@/common/models";
const credentialsSchema = z.object({
    name: z.string(),
    login: z.string(),
    email: z.string().min(1, "Укажи логин или почту"),
    password: z.string().min(1, "Укажи пароль").max(1024)
});
type Values = z.infer<typeof credentialsSchema>;
export default function AccountPage({ mode }: { mode: "setup" | "login" | "join" }) {
    const form = useForm<Values>({
        resolver: zodResolver(credentialsSchema),
        mode: "onChange",
        defaultValues: { name: "", login: "", email: "", password: "" }
    });
    const [setup] = useAuthSetupMutation();
    const [login] = useAuthLoginMutation();
    const [accept] = useAuthAcceptMutation();
    const [error, setError] = useState("");
    const navigate = useNavigate();
    async function submit(values: Values) {
        setError("");
        try {
            if (mode === "setup") await setup({ credentialsRequest: values }).unwrap();
            else if (mode === "login") await login({ credentialsRequest: { ...values, login: values.email } }).unwrap();
            else await accept({ acceptInvitationRequest: { ...values, token: location.hash.slice(1) } }).unwrap();
            store.dispatch(api.util.resetApiState());
            navigate("/", { replace: true });
        } catch (failure) {
            setError(message(failure));
        }
    }
    return (
        <Box sx={{ maxWidth: 480, mx: "auto", py: 5, px: 3 }}>
            <form onSubmit={form.handleSubmit(submit)}>
                <Stack gap={2.5}>
                    <Typography variant="h5">
                        {mode === "setup"
                            ? "Твоя учётная запись"
                            : mode === "join"
                              ? "Присоединиться к команде"
                              : "Войти в Workdesk"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {mode === "setup"
                            ? "Личные материалы останутся твоими. В общие пространства можно приглашать участников."
                            : mode === "join"
                              ? "Для нового аккаунта придумай пароль от 12 символов. Если аккаунт уже есть, введи его почту и пароль."
                              : "Открой личные задачи и доступные тебе командные пространства."}
                    </Typography>
                    {mode !== "login" && <TextField label="Имя" {...form.register("name")} autoComplete="name" />}
                    {mode !== "login" && (
                        <TextField
                            label="Логин"
                            {...form.register("login")}
                            autoComplete="username"
                            helperText="3–40 латинских букв, цифр, дефисов и подчёркиваний"
                        />
                    )}
                    <TextField
                        label={mode === "login" ? "Логин или почта" : "Почта"}
                        {...form.register("email")}
                        autoComplete={mode === "login" ? "username" : "email"}
                        error={!!form.formState.errors.email}
                        helperText={form.formState.errors.email?.message}
                    />
                    <TextField
                        label="Пароль"
                        type="password"
                        {...form.register("password")}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        error={!!form.formState.errors.password}
                        helperText={
                            form.formState.errors.password?.message ?? (mode !== "login" ? "Не меньше 12 символов" : "")
                        }
                    />
                    {error && <Alert severity="error">{error}</Alert>}
                    <Button variant="contained" type="submit" disabled={form.formState.isSubmitting}>
                        {mode === "setup" ? "Создать аккаунт" : mode === "join" ? "Присоединиться" : "Войти"}
                    </Button>
                </Stack>
            </form>
        </Box>
    );
}
