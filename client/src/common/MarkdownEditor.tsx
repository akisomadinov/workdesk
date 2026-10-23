import { useMemo, useRef, useState } from "react";
import { Box, Button, ButtonGroup, Divider, IconButton, Stack, Tooltip, Typography, useTheme } from "@mui/material";
import FormatBoldRounded from "@mui/icons-material/FormatBoldRounded";
import FormatItalicRounded from "@mui/icons-material/FormatItalicRounded";
import ChecklistRounded from "@mui/icons-material/ChecklistRounded";
import CodeRounded from "@mui/icons-material/CodeRounded";
import LinkRounded from "@mui/icons-material/LinkRounded";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, insertNewlineContinueMarkup } from "@codemirror/lang-markdown";
import { EditorView, keymap } from "@codemirror/view";
import MarkdownView from "./MarkdownView";
import type { NoteLink } from "./markdown";
interface Props {
    value: string;
    onChange: (value: string) => void;
    label: string;
    notes?: NoteLink[];
    workspaceId?: string | null;
    readOnly?: boolean;
    minHeight?: number;
}
export default function MarkdownEditor({
    value,
    onChange,
    label,
    notes = [],
    workspaceId,
    readOnly = false,
    minHeight = 200
}: Props) {
    const [mode, setMode] = useState(readOnly ? "preview" : "write");
    const view = useRef<EditorView | null>(null);
    const theme = useTheme();
    function insert(before: string, after = "") {
        const editor = view.current;
        if (!editor || readOnly) return false;
        const selection = editor.state.selection.main;
        editor.dispatch({
            changes: {
                from: selection.from,
                to: selection.to,
                insert: before + editor.state.sliceDoc(selection.from, selection.to) + after
            },
            selection: { anchor: selection.from + before.length, head: selection.to + before.length }
        });
        editor.focus();
        return true;
    }
    const extensions = useMemo(
        () => [
            markdown(),
            EditorView.lineWrapping,
            EditorView.contentAttributes.of({ "aria-label": label }),
            keymap.of([
                { key: "Mod-b", run: () => insert("**", "**") },
                { key: "Mod-i", run: () => insert("*", "*") },
                { key: "Enter", run: insertNewlineContinueMarkup }
            ]),
            EditorView.theme({
                "&": { backgroundColor: theme.palette.background.paper, color: theme.palette.text.primary },
                ".cm-content": {
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    fontSize: "13px",
                    padding: "16px 8px",
                    minHeight: `${minHeight}px`
                },
                ".cm-gutters": {
                    backgroundColor: theme.palette.background.default,
                    borderColor: theme.palette.divider,
                    color: theme.palette.text.secondary
                },
                "&.cm-focused": { outline: "none" }
            })
        ],
        [label, minHeight, theme, readOnly]
    );
    return (
        <Box
            sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden", bgcolor: "background.paper" }}
        >
            <Stack
                direction="row"
                alignItems="center"
                gap={1}
                flexWrap="wrap"
                sx={{ px: 1, py: 0.75, bgcolor: "background.default" }}
            >
                <Typography variant="caption" fontWeight={650} sx={{ mr: "auto", pl: 1 }}>
                    {label}
                </Typography>
                <ButtonGroup size="small" variant="text">
                    {(readOnly ? ["preview"] : ["write", "split", "preview"]).map((option) => (
                        <Button
                            key={option}
                            onClick={() => setMode(option)}
                            color={mode === option ? "primary" : "inherit"}
                        >
                            {{ write: "Писать", split: "Рядом", preview: "Читать" }[option]}
                        </Button>
                    ))}
                </ButtonGroup>
            </Stack>
            {!readOnly && mode !== "preview" && (
                <Stack direction="row" gap={0.5} sx={{ px: 1, py: 0.5, borderTop: 1, borderColor: "divider" }}>
                    {[
                        {
                            label: "Жирный · ⌘/Ctrl+B",
                            icon: <FormatBoldRounded fontSize="small" />,
                            before: "**",
                            after: "**"
                        },
                        {
                            label: "Курсив · ⌘/Ctrl+I",
                            icon: <FormatItalicRounded fontSize="small" />,
                            before: "*",
                            after: "*"
                        },
                        {
                            label: "Чек-лист",
                            icon: <ChecklistRounded fontSize="small" />,
                            before: "\n- [ ] ",
                            after: ""
                        },
                        {
                            label: "Блок кода",
                            icon: <CodeRounded fontSize="small" />,
                            before: "\n```\n",
                            after: "\n```\n"
                        },
                        { label: "Ссылка", icon: <LinkRounded fontSize="small" />, before: "[", after: "](https://)" }
                    ].map((action) => (
                        <Tooltip key={action.label} title={action.label}>
                            <IconButton
                                size="small"
                                aria-label={action.label}
                                onClick={() => insert(action.before, action.after)}
                            >
                                {action.icon}
                            </IconButton>
                        </Tooltip>
                    ))}
                    <Typography variant="caption" color="text.secondary" sx={{ ml: "auto", alignSelf: "center" }}>
                        Markdown · [[ссылки]]
                    </Typography>
                </Stack>
            )}
            <Divider />
            <Box sx={{ display: "grid", gridTemplateColumns: mode === "split" ? { xs: "1fr", lg: "1fr 1fr" } : "1fr" }}>
                {!readOnly && mode !== "preview" && (
                    <CodeMirror
                        theme={theme.palette.mode}
                        value={value}
                        onChange={onChange}
                        extensions={extensions}
                        onCreateEditor={(editor) => {
                            view.current = editor;
                        }}
                        basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
                    />
                )}
                {(mode !== "write" || readOnly) && (
                    <Box
                        sx={{
                            p: 2.5,
                            minHeight,
                            minWidth: 0,
                            borderLeft: mode === "split" ? 1 : 0,
                            borderColor: "divider"
                        }}
                    >
                        <MarkdownView value={value} notes={notes} workspaceId={workspaceId} />
                    </Box>
                )}
            </Box>
        </Box>
    );
}
