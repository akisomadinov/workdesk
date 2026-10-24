import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    FormControlLabel,
    LinearProgress,
    Stack,
    Switch,
    Typography
} from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMergeRequestsDetailsQuery, useMergeRequestsReadMutation } from "@/api/autogen/workdesk";
import { dateTime, message, safeLink } from "@/common/models";
import MarkdownView from "@/common/MarkdownView";
import { mergeState } from "./MergeRequestRow";
import useMergeRequests from "./useMergeRequests";
import CommentCode from "./CommentCode";

export default function MergeRequestDetails() {
    const { id = "" } = useParams();
    const [params, setParams] = useSearchParams();
    const page = Math.max(1, Number(params.get("page")) || 1);
    const {
        currentData: details,
        isFetching,
        error
    } = useMergeRequestsDetailsQuery({ id, page }, { pollingInterval: 15000 });
    const [read, readStatus] = useMergeRequestsReadMutation();
    const actions = useMergeRequests();
    const item = details?.item;
    const source = actions.connections.find((connection) => connection.id === item?.connectionId);
    const comments = details?.comments ?? [];
    const unread = comments.filter((comment) => !comment.read && comment.id).map((comment) => comment.id!);
    async function markRead() {
        actions.setError("");
        try {
            await read({ id, readMergeCommentsRequest: { ids: unread } }).unwrap();
        } catch (problem) {
            actions.setError(message(problem));
        }
    }
    return (
        <Stack gap={2.5} sx={{ maxWidth: 1000, minWidth: 0 }}>
            <Button
                component={Link}
                to="/merge-requests"
                startIcon={<ArrowBackRounded />}
                color="inherit"
                sx={{ alignSelf: "start" }}
            >
                Все MR
            </Button>
            {(error || actions.error) && <Alert severity="error">{actions.error || message(error)}</Alert>}
            {!details && isFetching && <LinearProgress aria-label="Загрузка обсуждения" />}
            {item && (
                <>
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                            {item.project} {item.provider === "gitlab" ? "!" : "#"}
                            {item.number} · {item.source}
                        </Typography>
                        <Typography variant="h4" component="h1" sx={{ mt: 1, overflowWrap: "anywhere" }}>
                            {item.title}
                        </Typography>
                        <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap" sx={{ mt: 1.5 }}>
                            <Chip size="small" label={mergeState(item)} variant="outlined" />
                            <Typography variant="body2" color="text.secondary">
                                {item.isAuthor ? "Ты автор" : `Автор: ${item.author}`}
                            </Typography>
                            {item.reviewers && (
                                <Typography variant="body2" color="text.secondary">
                                    Ревью: {item.reviewers}
                                </Typography>
                            )}
                        </Stack>
                    </Box>
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        gap={1.5}
                        alignItems={{ xs: "start", sm: "center" }}
                        justifyContent="space-between"
                    >
                        <FormControlLabel
                            label="Уведомления о комментариях"
                            control={
                                <Switch
                                    checked={!!item.notificationsEnabled}
                                    disabled={actions.notificationPending}
                                    onChange={(_, enabled) => void actions.setNotifications(id, enabled)}
                                />
                            }
                        />
                        {safeLink(item.url) && (
                            <Button
                                component="a"
                                href={safeLink(item.url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                endIcon={<OpenInNewRounded />}
                            >
                                {item.provider === "gitlab" ? "Открыть в GitLab" : "Открыть в GitHub"}
                            </Button>
                        )}
                    </Stack>
                    {source && (!source.enabled || !source.hasToken || !source.watchMergeRequests) && (
                        <Typography variant="body2" color="text.secondary">
                            Автообновление пока не настроено.{" "}
                            <Button component={Link} to="/settings/connections" size="small">
                                Подключить
                            </Button>
                        </Typography>
                    )}
                    <Accordion
                        disableGutters
                        variant="outlined"
                        sx={{ "&:before": { display: "none" }, borderRadius: 1 }}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                            <Typography variant="body2">Описание и ветки</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, overflowWrap: "anywhere" }}>
                                {item.sourceBranch} → {item.targetBranch}
                            </Typography>
                            <MarkdownView value={details.description ?? ""} />
                        </AccordionDetails>
                    </Accordion>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                        <Typography variant="h6" component="h2">
                            Комментарии{" "}
                            <Typography component="span" color="text.secondary">
                                {item.commentCount ?? 0}
                            </Typography>
                        </Typography>
                        {unread.length > 0 && (
                            <Button disabled={readStatus.isLoading} onClick={() => void markRead()}>
                                Прочитано
                            </Button>
                        )}
                    </Stack>
                    {comments.length === 0 && (
                        <Typography color="text.secondary" sx={{ py: 3 }}>
                            Комментариев пока нет. Новые появятся после синхронизации.
                        </Typography>
                    )}
                    <Stack gap={3} divider={<Divider />}>
                        {comments.map((comment) => (
                            <Box key={comment.id} component="article" sx={{ minWidth: 0 }}>
                                {comment.codeContext && <CommentCode context={comment.codeContext} />}
                                <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
                                    <Typography variant="body2" fontWeight={650}>
                                        {comment.author}
                                        {comment.isOwn ? " · ты" : ""}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {dateTime(comment.postedAt)}
                                    </Typography>
                                    {!comment.read && (
                                        <Chip size="small" label="Новый" color="primary" sx={{ height: 22 }} />
                                    )}
                                </Stack>
                                <MarkdownView value={comment.body ?? ""} />
                                {safeLink(comment.url) && (
                                    <Button
                                        size="small"
                                        component="a"
                                        href={safeLink(comment.url)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={{ mt: 1 }}
                                    >
                                        Открыть обсуждение
                                    </Button>
                                )}
                            </Box>
                        ))}
                    </Stack>
                    {(details.totalPages ?? 1) > 1 && (
                        <Stack direction="row" gap={1} alignItems="center" justifyContent="center">
                            <Button
                                disabled={(details.page ?? 1) <= 1}
                                onClick={() => setParams({ page: String((details.page ?? 1) - 1) })}
                            >
                                Новее
                            </Button>
                            <Typography variant="body2">
                                {details.page} / {details.totalPages}
                            </Typography>
                            <Button
                                disabled={(details.page ?? 1) >= (details.totalPages ?? 1)}
                                onClick={() => setParams({ page: String((details.page ?? 1) + 1) })}
                            >
                                Раньше
                            </Button>
                        </Stack>
                    )}
                </>
            )}
        </Stack>
    );
}
