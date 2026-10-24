import { memo } from "react";
import { Box, Chip, IconButton, ListItem, ListItemButton, Stack, Tooltip, Typography } from "@mui/material";
import NotificationsOutlined from "@mui/icons-material/NotificationsOutlined";
import NotificationsOffOutlined from "@mui/icons-material/NotificationsOffOutlined";
import { Link } from "react-router-dom";
import type { MergeRequestResponse } from "@/api/autogen/workdesk";

export function mergeState(item: MergeRequestResponse) {
    return item.state === "merged" ? "Влит" : item.state === "closed" ? "Закрыт" : item.draft ? "Черновик" : "Открыт";
}
function MergeRequestRow({
    item,
    pending,
    onNotify
}: {
    item: MergeRequestResponse;
    pending: boolean;
    onNotify: (id: string, enabled: boolean) => void;
}) {
    const notificationLabel = item.notificationsEnabled ? "Выключить уведомления" : "Включить уведомления";
    return (
        <ListItem disablePadding sx={{ borderBottom: 1, borderColor: "divider", gap: 1 }}>
            <ListItemButton
                component={Link}
                to={`/merge-requests/${item.id}`}
                sx={{ minWidth: 0, py: 2, px: { xs: 1, sm: 2 }, borderRadius: 1 }}
            >
                <Box sx={{ minWidth: 0, width: "100%" }}>
                    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.75 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                            {item.project} {item.provider === "gitlab" ? "!" : "#"}
                            {item.number}
                        </Typography>
                        <Chip
                            size="small"
                            variant="outlined"
                            label={mergeState(item)}
                            sx={{ height: 22, fontSize: 11 }}
                        />
                        {!!item.unreadComments && (
                            <Chip
                                size="small"
                                color="primary"
                                label={`Новых: ${item.unreadComments}`}
                                sx={{ height: 22 }}
                            />
                        )}
                    </Stack>
                    <Typography fontWeight={600} sx={{ overflowWrap: "anywhere" }}>
                        {item.title}
                    </Typography>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 0.75, overflowWrap: "anywhere" }}
                    >
                        {item.source} ·{" "}
                        {item.needsMyReview ? "Нужно твоё ревью" : item.isAuthor ? "Ты автор" : item.author} ·
                        Комментариев: {item.commentCount ?? 0}
                    </Typography>
                </Box>
            </ListItemButton>
            <Tooltip title={notificationLabel}>
                <span>
                    <IconButton
                        disabled={pending}
                        aria-label={`${notificationLabel}: ${item.title}`}
                        aria-pressed={!!item.notificationsEnabled}
                        onClick={() => onNotify(item.id ?? "", !item.notificationsEnabled)}
                        sx={{ mr: { xs: 0, sm: 1 } }}
                    >
                        {item.notificationsEnabled ? (
                            <NotificationsOutlined fontSize="small" />
                        ) : (
                            <NotificationsOffOutlined fontSize="small" />
                        )}
                    </IconButton>
                </span>
            </Tooltip>
        </ListItem>
    );
}
export default memo(MergeRequestRow);
