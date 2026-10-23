import { useMemo } from "react";
import { Box, Link } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useNavigate } from "react-router-dom";
import { wikiPlugin } from "./markdown";
import type { NoteLink } from "./markdown";
export default function MarkdownView({
    value,
    notes = [],
    workspaceId,
    beforeNavigate
}: {
    value: string;
    notes?: NoteLink[];
    workspaceId?: string | null;
    beforeNavigate?: () => Promise<boolean>;
}) {
    const navigate = useNavigate();
    const wiki = useMemo(() => wikiPlugin(notes, workspaceId), [notes, workspaceId]);
    return (
        <Box
            sx={{
                fontSize: 14,
                lineHeight: 1.8,
                overflowWrap: "anywhere",
                "& h1": { fontSize: 26 },
                "& h2": { fontSize: 21, mt: 3 },
                "& h3": { fontSize: 17 },
                "& pre": { bgcolor: "background.default", p: 2, borderRadius: 2, overflowX: "auto", fontSize: 12 },
                "& code": {
                    fontFamily: "ui-monospace, monospace",
                    bgcolor: "background.default",
                    px: 0.4,
                    borderRadius: 0.5
                },
                "& blockquote": { borderLeft: 3, borderColor: "primary.main", pl: 2, ml: 0, color: "text.secondary" },
                "& table": { borderCollapse: "collapse", display: "block", overflowX: "auto" },
                "& th, & td": { border: 1, borderColor: "divider", px: 1.5, py: 0.75 },
                "& li": { mb: 0.5 },
                "& hr": { border: 0, borderTop: 1, borderColor: "divider", my: 3 }
            }}
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm, wiki]}
                skipHtml
                components={{
                    a: ({ href, children }) => (
                        <Link
                            href={href}
                            target={href?.startsWith("/") ? undefined : "_blank"}
                            rel="noopener noreferrer"
                            onClick={async (event) => {
                                if (href?.startsWith("/") && !href.startsWith("//")) {
                                    event.preventDefault();
                                    if (!beforeNavigate || (await beforeNavigate())) navigate(href);
                                }
                            }}
                        >
                            {children}
                        </Link>
                    ),
                    img: ({ alt }) => (
                        <Box component="span" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                            [Изображение: {alt || "без подписи"}]
                        </Box>
                    )
                }}
            >
                {value || "*Пока нет текста.*"}
            </ReactMarkdown>
        </Box>
    );
}
