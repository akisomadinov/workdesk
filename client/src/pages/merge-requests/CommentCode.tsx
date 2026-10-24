import { Box, Chip, Stack, Typography } from "@mui/material";
import type { MergeCodeContext } from "@/api/autogen/workdesk";

export default function CommentCode({ context }: { context: MergeCodeContext }) {
    const lines = context.lines ?? [];
    return (
        <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, overflow: "hidden", mb: 2 }}>
            <Stack gap={0.75} sx={{ px: 1.5, py: 1.25, bgcolor: "background.default" }}>
                <Typography variant="body2" fontFamily="monospace" sx={{ overflowWrap: "anywhere" }}>
                    {context.path}
                </Typography>
                {context.oldPath && context.oldPath !== context.path && (
                    <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                        Ранее: {context.oldPath}
                    </Typography>
                )}
                <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                    <Typography variant="caption" color="text.secondary">
                        {context.newLine != null
                            ? `Строка ${context.newLine}`
                            : context.oldLine != null
                              ? `Удалённая строка ${context.oldLine}`
                              : "Комментарий к файлу"}
                        {context.commit ? ` · ${context.commit.slice(0, 8)}` : ""}
                    </Typography>
                    {context.outdated && <Chip label="Предыдущая версия" size="small" variant="outlined" />}
                    {context.resolved != null && (
                        <Chip
                            label={context.resolved ? "Обсуждение закрыто" : "Открытое замечание"}
                            size="small"
                            variant="outlined"
                        />
                    )}
                </Stack>
            </Stack>
            {lines.length > 0 ? (
                <Box
                    sx={{ overflowX: "auto" }}
                    tabIndex={0}
                    role="region"
                    aria-label="Код, к которому оставлен комментарий"
                >
                    <Box
                        component="table"
                        sx={{
                            borderCollapse: "collapse",
                            width: "100%",
                            fontFamily: "monospace",
                            fontSize: 12,
                            lineHeight: 1.8
                        }}
                    >
                        <Box component="tbody">
                            {lines.map((line, index) => (
                                <Box
                                    component="tr"
                                    key={index}
                                    sx={{
                                        bgcolor:
                                            line.kind === "added"
                                                ? "success.light"
                                                : line.kind === "removed"
                                                  ? "error.light"
                                                  : "background.paper"
                                    }}
                                >
                                    <Box
                                        component="td"
                                        sx={{
                                            width: 3,
                                            minWidth: 3,
                                            p: 0,
                                            bgcolor: line.highlighted ? "primary.main" : "transparent"
                                        }}
                                    />
                                    <Box
                                        component="td"
                                        sx={{
                                            width: 36,
                                            px: 1,
                                            textAlign: "right",
                                            color: "text.secondary",
                                            userSelect: "none"
                                        }}
                                    >
                                        {line.oldLine}
                                    </Box>
                                    <Box
                                        component="td"
                                        sx={{
                                            width: 36,
                                            px: 1,
                                            textAlign: "right",
                                            color: "text.secondary",
                                            userSelect: "none"
                                        }}
                                    >
                                        {line.newLine}
                                    </Box>
                                    <Box
                                        component="td"
                                        sx={{
                                            width: 14,
                                            color: line.kind === "removed" ? "error.main" : "success.main",
                                            userSelect: "none"
                                        }}
                                    >
                                        {line.kind === "added" ? "+" : line.kind === "removed" ? "−" : ""}
                                    </Box>
                                    <Box
                                        component="td"
                                        sx={{ whiteSpace: "pre", pr: 2, fontWeight: line.highlighted ? 700 : 400 }}
                                        aria-label={line.highlighted ? "Строка с замечанием" : undefined}
                                    >
                                        {line.text || " "}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Box>
            ) : (
                <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
                    Фрагмент этой версии недоступен. Файл и место замечания сохранены; код можно проверить в исходном
                    обсуждении.
                </Typography>
            )}
        </Box>
    );
}
