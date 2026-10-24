import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    LinearProgress,
    Link as MuiLink,
    List,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography
} from "@mui/material";
import SyncRounded from "@mui/icons-material/SyncRounded";
import { Link } from "react-router-dom";
import { useMergeRequestsGetQuery } from "@/api/autogen/workdesk";
import { message } from "@/common/models";
import MergeRequestRow from "./merge-requests/MergeRequestRow";
import useMergeRequests from "./merge-requests/useMergeRequests";

export default function MergeRequestsPage() {
    const { data: items = [], isLoading, error } = useMergeRequestsGetQuery(undefined, { pollingInterval: 15000 });
    const actions = useMergeRequests();
    const [filter, setFilter] = useState("mine");
    const [query, setQuery] = useState("");
    const visible = items.filter((item) => {
        const open = item.state !== "closed" && item.state !== "merged";
        return (
            (filter === "closed"
                ? !open
                : open && (filter === "all" || (filter === "mine" ? item.isAuthor : item.needsMyReview))) &&
            `${item.title} ${item.project} ${item.number} ${item.source}`
                .toLocaleLowerCase()
                .includes(query.trim().toLocaleLowerCase())
        );
    });
    return (
        <Stack gap={2.5} sx={{ maxWidth: 1080 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
                <Box>
                    <Typography variant="h4" component="h1">
                        Мои MR
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        Ревью и комментарии из твоих подключений.
                    </Typography>
                </Box>
                <Button
                    startIcon={<SyncRounded />}
                    variant="outlined"
                    disabled={!actions.canRefresh || actions.refreshing}
                    onClick={() => void actions.refresh()}
                >
                    {actions.refreshing ? "Обновляем…" : "Обновить"}
                </Button>
            </Stack>
            {(actions.error || error) && <Alert severity="error">{actions.error || message(error)}</Alert>}
            {!actions.canRefresh && !isLoading && (
                <Alert
                    severity="info"
                    action={
                        <Button component={Link} to="/settings/connections" color="inherit">
                            Настроить
                        </Button>
                    }
                >
                    Для новых комментариев включи отслеживание MR в подключении и добавь токен с правом чтения API.
                </Alert>
            )}
            <Tabs
                value={filter}
                onChange={(_, value: string) => setFilter(value)}
                variant="scrollable"
                scrollButtons="auto"
                aria-label="Фильтр MR"
            >
                <Tab value="mine" label="Мои" />
                <Tab value="review" label="На моём ревью" />
                <Tab value="all" label="Открытые" />
                <Tab value="closed" label="Завершённые" />
            </Tabs>
            <TextField
                size="small"
                placeholder="Поиск по названию, проекту или номеру"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                slotProps={{ htmlInput: { "aria-label": "Поиск MR" } }}
            />
            {isLoading && <LinearProgress aria-label="Загрузка MR" />}
            {!isLoading && !error && visible.length === 0 && (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                    {query
                        ? "По этому запросу ничего не найдено."
                        : filter === "review"
                          ? "Пока нет запросов на твоё ревью."
                          : filter === "closed"
                            ? "Здесь появятся влитые и закрытые MR после синхронизации."
                            : "Здесь появятся MR из выбранных проектов."}
                </Typography>
            )}
            <List disablePadding aria-label="Merge requests">
                {visible.map((item) => (
                    <MergeRequestRow
                        key={item.id}
                        item={item}
                        pending={actions.notificationPending}
                        onNotify={(id, enabled) => void actions.setNotifications(id, enabled)}
                    />
                ))}
            </List>
            {items.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                    Колокольчик управляет уведомлениями этого MR.{" "}
                    <MuiLink component={Link} to="/settings/notifications">
                        Настроить Telegram
                    </MuiLink>
                </Typography>
            )}
        </Stack>
    );
}
