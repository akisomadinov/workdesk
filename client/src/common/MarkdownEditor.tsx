import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Menu,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Tooltip,
    useTheme
} from "@mui/material";
import FormatBoldRounded from "@mui/icons-material/FormatBoldRounded";
import FormatItalicRounded from "@mui/icons-material/FormatItalicRounded";
import ChecklistRounded from "@mui/icons-material/ChecklistRounded";
import LinkRounded from "@mui/icons-material/LinkRounded";
import CodeRounded from "@mui/icons-material/CodeRounded";
import UndoRounded from "@mui/icons-material/UndoRounded";
import RedoRounded from "@mui/icons-material/RedoRounded";
import ArrowDropDownRounded from "@mui/icons-material/ArrowDropDownRounded";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/core";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { useForm } from "react-hook-form";
import MarkdownView from "./MarkdownView";
import type { NoteLink } from "./markdown";
import { editorExtensions } from "./editor/extensions";
import { blocks } from "./editor/commands";
interface Props {
    value: string;
    onChange: (value: string) => void;
    label: string;
    notes?: NoteLink[];
    workspaceId?: string | null;
    readOnly?: boolean;
    minHeight?: number;
}
interface Slash {
    from: number;
    to: number;
    query: string;
    left: number;
    top: number;
}
// Preserve unsupported raw HTML and footnotes instead of dropping them during conversion.
function needsSource(value: string) {
    const prose = value.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`]*`/g, "");
    return /<\/?[a-z][^>]*>|^\[\^[^\]]+\]:/im.test(prose);
}
const bubbleOptions = { placement: "top" as const };
export default function MarkdownEditor({
    value,
    onChange,
    label,
    notes = [],
    workspaceId,
    readOnly = false,
    minHeight = 200
}: Props) {
    const theme = useTheme();
    const unsupported = needsSource(value);
    const [mode, setMode] = useState<"visual" | "source" | "read">(unsupported ? "source" : "visual");
    const [menu, setMenu] = useState<HTMLElement | null>(null);
    const [linkOpen, setLinkOpen] = useState(false);
    const linkForm = useForm({ defaultValues: { url: "", title: "" } });
    const [slash, setSlash] = useState<Slash | null>(null);
    const [slashIndex, setSlashIndex] = useState(0);
    const slashRef = useRef<{ value: Slash | null; index: number }>({ value: null, index: 0 });
    slashRef.current = { value: slash, index: slashIndex };
    const emitted = useRef(value);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    function choices(query: string) {
        return blocks.filter((block) =>
            `${block.label} ${block.hint}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())
        );
    }
    function runSlash(editor: Editor, index: number) {
        const current = slashRef.current.value;
        const action = current && choices(current.query)[index];
        if (!current || !action) return;
        editor.chain().focus().deleteRange({ from: current.from, to: current.to }).run();
        action.run(editor);
        setSlash(null);
    }
    function updateSlash(editor: Editor) {
        const selection = editor.state.selection;
        const prefix = selection.$from.parent.textBetween(0, selection.$from.parentOffset);
        const match =
            selection.empty && selection.$from.parent.type.name === "paragraph" && /^\/([^\s/]*)$/.exec(prefix);
        if (!match) {
            setSlash(null);
            return;
        }
        const coords = editor.view.coordsAtPos(selection.from);
        setSlash({
            from: selection.from - prefix.length,
            to: selection.from,
            query: match[1],
            left: coords.left,
            top: coords.bottom + 6
        });
        setSlashIndex(0);
    }
    const editor = useEditor({
        extensions: editorExtensions(notes, workspaceId),
        content: unsupported ? "" : value,
        contentType: "markdown",
        editable: !readOnly,
        shouldRerenderOnTransaction: true,
        editorProps: {
            attributes: { "aria-label": label, role: "textbox", "aria-multiline": "true", spellcheck: "true" },
            handleKeyDown: (_view, event) => {
                const current = slashRef.current;
                if (!current.value) return false;
                const count = choices(current.value.query).length;
                if (event.key === "Escape") {
                    setSlash(null);
                    return true;
                }
                if (count && ["ArrowDown", "ArrowUp"].includes(event.key)) {
                    setSlashIndex((current.index + (event.key === "ArrowDown" ? 1 : -1) + count) % count);
                    return true;
                }
                if (event.key === "Enter" && count && editor) {
                    runSlash(editor, current.index);
                    return true;
                }
                return false;
            }
        },
        onUpdate: ({ editor }) => {
            const markdown = editor.getMarkdown();
            emitted.current = markdown;
            onChangeRef.current(markdown);
            updateSlash(editor);
        },
        onBlur: () => setSlash(null),
        onSelectionUpdate: ({ editor }) => {
            if (slashRef.current.value) updateSlash(editor);
        }
    });
    useEffect(() => {
        if (!editor || value === emitted.current || needsSource(value)) return;
        emitted.current = value;
        editor.commands.setContent(value, { contentType: "markdown", emitUpdate: false });
    }, [value, editor]);
    useEffect(() => {
        editor?.setEditable(!readOnly);
    }, [editor, readOnly]);
    const sourceMode = mode === "source" || unsupported;
    function openLink() {
        if (!editor) return;
        linkForm.reset({
            url: String(editor.getAttributes("link").href ?? ""),
            title: editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to)
        });
        setLinkOpen(true);
    }
    function formats() {
        return (
            <>
                <Tooltip title="Жирный · Ctrl/⌘ B">
                    <IconButton
                        size="small"
                        aria-label="Жирный"
                        aria-pressed={editor?.isActive("bold")}
                        color={editor?.isActive("bold") ? "primary" : "default"}
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                    >
                        <FormatBoldRounded fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Курсив · Ctrl/⌘ I">
                    <IconButton
                        size="small"
                        aria-label="Курсив"
                        aria-pressed={editor?.isActive("italic")}
                        color={editor?.isActive("italic") ? "primary" : "default"}
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                    >
                        <FormatItalicRounded fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Ссылка">
                    <IconButton size="small" aria-label="Вставить ссылку" onClick={openLink}>
                        <LinkRounded fontSize="small" />
                    </IconButton>
                </Tooltip>
            </>
        );
    }
    if (readOnly) return <MarkdownView value={value} notes={notes} workspaceId={workspaceId} />;
    return (
        <Box sx={{ minWidth: 0 }}>
            <Stack
                direction="row"
                alignItems="center"
                flexWrap="wrap"
                gap={0.5}
                sx={{ borderBottom: 1, borderColor: "divider", pb: 1, mb: 2 }}
            >
                {!sourceMode && mode !== "read" && (
                    <>
                        <Button
                            color="inherit"
                            size="small"
                            endIcon={<ArrowDropDownRounded />}
                            onClick={(event) => setMenu(event.currentTarget)}
                            aria-label="Тип блока"
                        >
                            {editor?.isActive("heading")
                                ? `Заголовок ${editor.getAttributes("heading").level}`
                                : "Текст"}
                        </Button>
                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                        {formats()}
                        <Tooltip title="Чек-лист">
                            <IconButton
                                size="small"
                                aria-label="Чек-лист"
                                onClick={() => editor?.chain().focus().toggleTaskList().run()}
                            >
                                <ChecklistRounded fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Отменить">
                            <span>
                                <IconButton
                                    size="small"
                                    aria-label="Отменить изменение"
                                    disabled={!editor?.can().undo()}
                                    onClick={() => editor?.chain().focus().undo().run()}
                                >
                                    <UndoRounded fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Повторить">
                            <span>
                                <IconButton
                                    size="small"
                                    aria-label="Повторить изменение"
                                    disabled={!editor?.can().redo()}
                                    onClick={() => editor?.chain().focus().redo().run()}
                                >
                                    <RedoRounded fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </>
                )}
                <Box sx={{ flex: 1 }} />
                <Button
                    size="small"
                    color="inherit"
                    onClick={() => {
                        setMode(mode === "read" ? "visual" : "read");
                        setSlash(null);
                    }}
                >
                    {mode === "read" ? "Редактировать" : "Читать"}
                </Button>
                <Tooltip title={sourceMode ? "Визуальный редактор" : "Исходник Markdown"}>
                    <IconButton
                        size="small"
                        aria-label={sourceMode ? "Визуальный редактор" : "Исходник Markdown"}
                        color={sourceMode ? "primary" : "default"}
                        disabled={unsupported && mode !== "read"}
                        onClick={() => {
                            setMode(sourceMode ? "visual" : "source");
                            setSlash(null);
                        }}
                    >
                        <CodeRounded fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Stack>
            {mode === "read" ? (
                <MarkdownView value={value} notes={notes} workspaceId={workspaceId} />
            ) : sourceMode ? (
                <>
                    {unsupported && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            В документе есть HTML или сноски. Для сохранения этих элементов открыт исходник Markdown.
                        </Alert>
                    )}
                    <CodeMirror
                        value={value}
                        onChange={(text) => {
                            onChange(text);
                        }}
                        theme={theme.palette.mode}
                        minHeight={`${minHeight}px`}
                        extensions={[
                            markdown(),
                            EditorView.lineWrapping,
                            EditorView.contentAttributes.of({ "aria-label": `${label}: Markdown` })
                        ]}
                        basicSetup={{ lineNumbers: false, foldGutter: false }}
                    />
                </>
            ) : (
                <Box
                    sx={{
                        "& .tiptap": {
                            outline: "none",
                            minHeight,
                            lineHeight: 1.8,
                            fontSize: 15,
                            overflowWrap: "anywhere",
                            pb: 5
                        },
                        "& .tiptap p": { my: 1 },
                        "& .tiptap > :first-of-type": { mt: 0 },
                        "& h1": { fontSize: 28, mt: 4, lineHeight: 1.3 },
                        "& h2": { fontSize: 22, mt: 3.5, lineHeight: 1.4 },
                        "& h3": { fontSize: 18, mt: 3 },
                        "& p.is-editor-empty:first-of-type::before": {
                            content: "attr(data-placeholder)",
                            color: "text.disabled",
                            float: "left",
                            height: 0,
                            pointerEvents: "none"
                        },
                        "& a, & .wiki-link": { color: "primary.main", textDecoration: "underline" },
                        "& .image-reference": { color: "text.secondary", fontStyle: "italic" },
                        "& pre": {
                            bgcolor: "background.default",
                            p: 2,
                            borderRadius: 1.5,
                            overflowX: "auto",
                            fontSize: 13
                        },
                        "& code": {
                            fontFamily: "ui-monospace, monospace",
                            bgcolor: "background.default",
                            borderRadius: 0.5,
                            px: 0.4
                        },
                        "& blockquote": {
                            borderLeft: 3,
                            borderColor: "divider",
                            pl: 2,
                            ml: 0,
                            color: "text.secondary"
                        },
                        "& ul, & ol": { pl: 3 },
                        "& li > p": { my: 0.25 },
                        '& ul[data-type="taskList"]': { listStyle: "none", pl: 0 },
                        "& li[data-checked]": {
                            display: "flex",
                            gap: 1,
                            alignItems: "baseline",
                            "& > div": { flex: 1 },
                            "& input": { accentColor: theme.palette.primary.main, cursor: "pointer" }
                        },
                        "& .tableWrapper": { overflowX: "auto" },
                        "& table": { borderCollapse: "collapse", width: "100%", tableLayout: "fixed" },
                        "& th, & td": {
                            border: 1,
                            borderColor: "divider",
                            p: 1,
                            position: "relative",
                            verticalAlign: "top",
                            minWidth: 60
                        },
                        "& th": { bgcolor: "background.default", textAlign: "left" },
                        "& .selectedCell::after": {
                            content: '""',
                            position: "absolute",
                            inset: 0,
                            bgcolor: "action.selected",
                            pointerEvents: "none"
                        },
                        "& hr": { border: 0, borderTop: 1, borderColor: "divider", my: 3 }
                    }}
                >
                    {editor?.isActive("table") && (
                        <Stack direction="row" flexWrap="wrap" sx={{ mb: 1 }}>
                            <Button size="small" onClick={() => editor.chain().focus().addRowAfter().run()}>
                                + Строка
                            </Button>
                            <Button size="small" onClick={() => editor.chain().focus().addColumnAfter().run()}>
                                + Столбец
                            </Button>
                            <Button
                                size="small"
                                color="inherit"
                                onClick={() => editor.chain().focus().deleteRow().run()}
                            >
                                Удалить строку
                            </Button>
                            <Button
                                size="small"
                                color="inherit"
                                onClick={() => editor.chain().focus().deleteColumn().run()}
                            >
                                Удалить столбец
                            </Button>
                            <Button
                                size="small"
                                color="inherit"
                                onClick={() => editor.chain().focus().deleteTable().run()}
                            >
                                Удалить таблицу
                            </Button>
                        </Stack>
                    )}
                    <EditorContent editor={editor} />
                    {editor && (
                        <BubbleMenu editor={editor} options={bubbleOptions}>
                            <Paper elevation={4} sx={{ p: 0.5, display: "flex", border: 1, borderColor: "divider" }}>
                                {formats()}
                            </Paper>
                        </BubbleMenu>
                    )}
                </Box>
            )}
            <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
                {blocks.map((block) => (
                    <MenuItem
                        key={block.id}
                        onClick={() => {
                            if (editor) block.run(editor);
                            setMenu(null);
                        }}
                    >
                        {block.label}
                    </MenuItem>
                ))}
            </Menu>
            {slash && mode === "visual" && (
                <Paper
                    role="listbox"
                    aria-label="Вставить блок"
                    elevation={6}
                    sx={{
                        position: "fixed",
                        zIndex: 1200,
                        left: Math.max(8, Math.min(slash.left, window.innerWidth - 264)),
                        top: Math.min(slash.top, window.innerHeight - 300),
                        width: 250,
                        maxHeight: 280,
                        overflowY: "auto",
                        border: 1,
                        borderColor: "divider",
                        py: 0.5
                    }}
                >
                    {choices(slash.query).map((block, index) => (
                        <MenuItem
                            key={block.id}
                            selected={index === slashIndex}
                            role="option"
                            aria-selected={index === slashIndex}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => editor && runSlash(editor, index)}
                        >
                            {block.label}
                        </MenuItem>
                    ))}
                    {!choices(slash.query).length && <MenuItem disabled>Блок не найден</MenuItem>}
                </Paper>
            )}
            <Dialog open={linkOpen} onClose={() => setLinkOpen(false)}>
                <form
                    onSubmit={linkForm.handleSubmit(({ url, title }) => {
                        if (!editor) return;
                        if (!/^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(url)) {
                            linkForm.setError("url", {
                                message: "Укажи https://, почту mailto: или путь внутри Workdesk"
                            });
                            return;
                        }
                        const document = notes.find((note) => url === `/notes/${note.id}`);
                        if (document)
                            editor
                                .chain()
                                .focus()
                                .insertContent({
                                    type: "wikiLink",
                                    attrs: { target: `note:${document.id}`, alias: title || document.title }
                                })
                                .run();
                        else if (editor.state.selection.empty)
                            editor
                                .chain()
                                .focus()
                                .insertContent({
                                    type: "text",
                                    text: title || url,
                                    marks: [{ type: "link", attrs: { href: url } }]
                                })
                                .run();
                        else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
                        setLinkOpen(false);
                    })}
                >
                    <DialogTitle>Вставить ссылку</DialogTitle>
                    <DialogContent>
                        <Stack gap={2} sx={{ pt: 1 }}>
                            {!!notes.length && (
                                <TextField
                                    select
                                    label="Документ Workdesk"
                                    value=""
                                    onChange={(event) => {
                                        const note = notes.find((note) => note.id === event.target.value);
                                        if (note) {
                                            linkForm.setValue("url", `/notes/${note.id}`);
                                            linkForm.setValue("title", note.title);
                                        }
                                    }}
                                >
                                    <MenuItem value="">Выбрать документ</MenuItem>
                                    {notes.map((note) => (
                                        <MenuItem key={note.id} value={note.id}>
                                            {note.title}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                            <TextField
                                autoFocus
                                label="Адрес ссылки"
                                {...linkForm.register("url", { required: "Укажи адрес" })}
                                error={!!linkForm.formState.errors.url}
                                helperText={linkForm.formState.errors.url?.message}
                            />
                            <TextField label="Текст ссылки" {...linkForm.register("title")} />
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={() => {
                                editor?.chain().focus().unsetLink().run();
                                setLinkOpen(false);
                            }}
                            color="inherit"
                        >
                            Убрать ссылку
                        </Button>
                        <Button onClick={() => setLinkOpen(false)}>Отмена</Button>
                        <Button type="submit" variant="contained">
                            Вставить
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
}
