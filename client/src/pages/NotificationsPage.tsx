import { Alert, Box, Button, Card, Chip, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useNotificationsGetQuery, useNotificationsReadMutation } from "@/api/autogen/workdesk";
import { dateTime, message, safeLink } from "@/common/models";
export default function NotificationsPage() {
    const { data: items = [], error } = useNotificationsGetQuery(undefined, { pollingInterval: 15000 });
    const [read] = useNotificationsReadMutation();
    const [failure, setFailure] = useState("");
    const delivery: Record<string, string> = {
        off: "В приложении",
        pending: "В очереди Telegram",
        sending: "Отправляем",
        sent: "Отправлено",
        failed: "Ошибка доставки",
        uncertain: "Доставка неизвестна"
    };
    return (
        <Stack gap={3}>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "start", sm: "center" }}
                gap={2}
            >
                <Box>
                    <Typography variant="h4">Уведомления</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Новые задачи, комментарии в MR/PR и приглашения.
                    </Typography>
                </Box>
                <Button
                    component={Link}
                    to="/settings/notifications"
                    color="inherit"
                    variant="outlined"
                    sx={{ flexShrink: 0 }}
                >
                    Настроить Telegram
                </Button>
            </Stack>
            {(failure || error) && <Alert severity="error">{failure || message(error)}</Alert>}
            {items.length === 0 && (
                <Typography color="text.secondary">
                    Новые события появятся здесь после синхронизации подключений.
                </Typography>
            )}
            {items.map((item) => (
                <Card
                    key={item.id}
                    variant="outlined"
                    sx={{ p: 2.5, borderLeft: item.read ? 1 : 3, borderColor: item.read ? "divider" : "primary.main" }}
                >
                    <Stack gap={1.5}>
                        <Stack direction="row" justifyContent="space-between" gap={2} flexWrap="wrap">
                            <Typography variant="body2" fontWeight={item.read ? 400 : 650}>
                                {item.title}
                            </Typography>
                            <Chip size="small" label={delivery[item.delivery ?? "off"] ?? item.delivery} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                            {dateTime(item.created)}
                        </Typography>
                        <Stack direction="row" gap={1}>
                            {item.kind === "invite" ? (
                                <Button component={Link} to="/team">
                                    Открыть приглашения
                                </Button>
                            ) : (
                                safeLink(item.url) && (
                                    <Button
                                        component="a"
                                        href={safeLink(item.url)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Открыть в трекере
                                    </Button>
                                )
                            )}
                            {!item.read && (
                                <Button
                                    color="inherit"
                                    onClick={async () => {
                                        try {
                                            await read({ id: item.id ?? "" }).unwrap();
                                        } catch (problem) {
                                            setFailure(message(problem));
                                        }
                                    }}
                                >
                                    Прочитано
                                </Button>
                            )}
                        </Stack>
                    </Stack>
                </Card>
            ))}
        </Stack>
    );
}
