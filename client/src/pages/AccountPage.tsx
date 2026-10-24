import { Alert, Box, Button, Link as MuiLink, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import { FormProvider } from "react-hook-form";
import { Link } from "react-router-dom";
import type { SessionResponse } from "@/api/autogen/workdesk";
import ThemeMenu from "@/common/layout/ThemeMenu";
import useAccountForm from "./account/useAccountForm";
import PasswordField from "./account/PasswordField";
import { accountPath } from "./account/navigation";

export default function AccountPage({
    mode,
    session
}: {
    mode: "register" | "login" | "join";
    session: SessionResponse;
}) {
    const account = useAccountForm(mode, session.setupRequired ?? false);
    const { form, creating, error } = account;
    const joining = mode === "join";
    const firstAccount = mode === "register" && session.setupRequired;
    const title = joining
        ? "Приглашение в команду"
        : firstAccount
          ? "Твоё пространство, твой аккаунт"
          : creating
            ? "Создать аккаунт"
            : "Войти в Workdesk";
    return (
        <Box sx={{ minHeight: "100dvh", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>
            <Stack
                component="header"
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ px: { xs: 2, sm: 4 }, py: 2 }}
            >
                <Stack direction="row" alignItems="center" gap={1}>
                    <DashboardRounded sx={{ color: "primary.main", fontSize: 24 }} />
                    <Typography fontWeight={750} letterSpacing={-0.5}>
                        Workdesk
                    </Typography>
                </Stack>
                <ThemeMenu />
            </Stack>
            <Box
                component="main"
                sx={{ width: "100%", maxWidth: 456, mx: "auto", px: { xs: 2.5, sm: 3 }, pt: { xs: 2, sm: 5 }, pb: 5 }}
            >
                <Stack gap={3}>
                    <Box>
                        <Typography
                            variant="h4"
                            component="h1"
                            sx={{ fontSize: { xs: 26, sm: 30 }, lineHeight: 1.2, mb: 1.5 }}
                        >
                            {title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {firstAccount
                                ? "Задачи, документы, GitLab и Telegram сохранятся за этим аккаунтом. Придумай логин и пароль для входа."
                                : joining
                                  ? "После подтверждения здесь появятся общая доска и документы команды."
                                  : creating
                                    ? "Личные задачи, документы и подключения будут доступны только тебе."
                                    : "Продолжи работу со своими задачами и документами."}
                        </Typography>
                    </Box>
                    {joining && !account.validInvitation ? (
                        <Alert severity="warning">
                            В ссылке нет действительного приглашения. Попроси владельца команды прислать новую ссылку.
                        </Alert>
                    ) : joining && session.authenticated ? (
                        <Stack gap={2}>
                            <Typography variant="body2">
                                Присоединиться как <strong>{session.name}</strong> · @{session.login}
                            </Typography>
                            {error && <Alert severity="error">{error}</Alert>}
                            <Button
                                variant="contained"
                                disabled={account.joining}
                                onClick={() => void account.joinCurrent()}
                            >
                                {account.joining ? "Присоединяемся…" : "Присоединиться к команде"}
                            </Button>
                            <Button component={Link} to="/">
                                Вернуться в своё пространство
                            </Button>
                        </Stack>
                    ) : (
                        <>
                            {joining && (
                                <Tabs
                                    value={account.joinMode}
                                    onChange={(_, value: "new" | "existing") => account.changeJoinMode(value)}
                                    variant="fullWidth"
                                    aria-label="Аккаунт для приглашения"
                                >
                                    <Tab value="new" label="Создать аккаунт" />
                                    <Tab value="existing" label="Уже есть аккаунт" />
                                </Tabs>
                            )}
                            <FormProvider {...form}>
                                <Stack
                                    component="form"
                                    noValidate
                                    onSubmit={form.handleSubmit(account.submit)}
                                    gap={2.5}
                                >
                                    {creating && (
                                        <>
                                            <TextField
                                                label="Имя"
                                                {...form.register("name")}
                                                autoComplete="name"
                                                error={!!form.formState.errors.name}
                                                helperText={form.formState.errors.name?.message}
                                            />
                                            <TextField
                                                label="Логин"
                                                {...form.register("login")}
                                                autoComplete="username"
                                                slotProps={{ htmlInput: { autoCapitalize: "none", spellCheck: false } }}
                                                error={!!form.formState.errors.login}
                                                helperText={
                                                    form.formState.errors.login?.message ??
                                                    "По логину коллеги смогут пригласить тебя в команду"
                                                }
                                            />
                                        </>
                                    )}
                                    <TextField
                                        label={creating ? "Почта" : "Логин или почта"}
                                        type={creating ? "email" : "text"}
                                        {...form.register("email")}
                                        autoComplete={creating ? "email" : "username"}
                                        slotProps={{ htmlInput: { autoCapitalize: "none", spellCheck: false } }}
                                        error={!!form.formState.errors.email}
                                        helperText={form.formState.errors.email?.message}
                                    />
                                    <PasswordField creating={creating} />
                                    {creating && <PasswordField creating confirmation />}
                                    {error && <Alert severity="error">{error}</Alert>}
                                    <Button
                                        size="large"
                                        variant="contained"
                                        type="submit"
                                        disabled={form.formState.isSubmitting}
                                    >
                                        {form.formState.isSubmitting
                                            ? "Подожди…"
                                            : joining
                                              ? "Присоединиться"
                                              : creating
                                                ? "Создать аккаунт"
                                                : "Войти"}
                                    </Button>
                                </Stack>
                            </FormProvider>
                        </>
                    )}
                    {!joining && !firstAccount && (
                        <Typography variant="body2" color="text.secondary" textAlign="center">
                            {creating ? "Уже есть аккаунт? " : "Впервые здесь? "}
                            <MuiLink
                                component={Link}
                                to={accountPath(creating ? "login" : "register", account.returnTo)}
                                underline="hover"
                                fontWeight={600}
                            >
                                {creating ? "Войти" : "Создать аккаунт"}
                            </MuiLink>
                        </Typography>
                    )}
                    {firstAccount && (
                        <Typography variant="caption" color="text.secondary">
                            Это первая настройка на этом компьютере. Остальные пользователи создадут отдельные аккаунты
                            после тебя.
                        </Typography>
                    )}
                </Stack>
            </Box>
        </Box>
    );
}
