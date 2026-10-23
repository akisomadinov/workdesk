import { lazy, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    IconButton,
    List,
    Menu,
    MenuItem,
    Snackbar,
    Stack,
    TextField,
    Tooltip,
    Typography
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useNotesImportMutation, useTeamGetQuery } from "@/api/autogen/workdesk";
import type { NoteItem } from "@/hooks/useNotebook";
import type { NoteDocumentHandle } from "./notes/NoteDocument";
import NoteListItem from "./notes/NoteListItem";
import DeleteMaterialDialog from "@/common/DeleteMaterialDialog";
import { useNotes } from "@/hooks/useNotebook";
import { message } from "@/common/models";
import { noteTree, downloadMarkdown } from "@/common/markdown";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import NewDocumentDialog from "@/common/NewDocumentDialog";
const NoteDocument = lazy(() => import("./notes/NoteDocument"));

export default function NotesPage() {
    const { id } = useParams();
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const { notes, isLoading, error } = useNotes();
    const { scope } = useWorkspaceStore();
    const { data: spaces = [] } = useTeamGetQuery();
    const [importFiles, { isLoading: importing }] = useNotesImportMutation();
    const fileInput = useRef<HTMLInputElement>(null);
    const search = params.get("q") ?? "";
    const [archive, setArchive] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [menu, setMenu] = useState<HTMLElement | null>(null);
    const editor = useRef<NoteDocumentHandle>(null);
    const [remove, setRemove] = useState<NoteItem | null>(null);
    const [notice, setNotice] = useState("");
    const [failure, setFailure] = useState("");
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const visible = notes.filter(
        (note) =>
            (scope === "all" || (scope === "mine" ? !note.workspaceId : note.workspaceId === scope)) &&
            note.archived === archive &&
            `${note.title} ${note.body} ${note.project} ${note.tags}`
                .toLocaleLowerCase()
                .includes(search.toLocaleLowerCase())
    );
    const selected = notes.find((note) => note.id === id);
    const canCreate =
        ["mine", "all"].includes(scope) || spaces.some((space) => space.id === scope && space.role !== "reader");
    let hiddenDepth = Infinity;
    const tree = noteTree(visible).filter(({ note, depth }) => {
        if (search) return true;
        if (depth > hiddenDepth) return false;
        hiddenDepth = collapsed.has(note.id) ? depth : Infinity;
        return true;
    });
    function actions(note: NoteItem) {
        return {
            onDelete: () => {
                if (note.id === id) {
                    if (editor.current) editor.current.remove();
                    else setFailure("Дождись загрузки документа.");
                } else setRemove(note);
            },
            onRename: () => {
                if (note.id === id && editor.current) editor.current.rename();
                else navigate(`/notes/${note.id}?rename=1`);
            },
            onDownload: () => {
                if (note.id === id && editor.current) editor.current.download();
                else downloadMarkdown(note.title, note.body);
            },
            onCopyLink: async () => {
                try {
                    await navigator.clipboard.writeText(new URL(`/notes/${note.id}`, window.location.origin).href);
                    setNotice("Ссылка скопирована");
                } catch {
                    setFailure("Браузер не разрешил копирование. Открой документ и скопируй адрес из строки браузера.");
                }
            }
        };
    }
    function deleted() {
        setRemove(null);
        setNotice("Документ перемещён в корзину");
    }
    return (
        <Stack gap={3}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                <Typography variant="h4">Документы</Typography>
                <Button
                    aria-label="Новый документ"
                    variant="contained"
                    startIcon={<AddRounded />}
                    disabled={!canCreate}
                    onClick={() => setCreateOpen(true)}
                >
                    <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
                        Новый
                    </Box>
                    <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                        Новый документ
                    </Box>
                </Button>
            </Stack>
            {(failure || error) && (
                <Alert severity="error" onClose={() => setFailure("")}>
                    {failure || message(error)}
                </Alert>
            )}
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "240px minmax(0, 1fr)" },
                    gap: { xs: 2, lg: 4 },
                    alignItems: "start"
                }}
            >
                <Stack
                    gap={1.5}
                    sx={{
                        minWidth: 0,
                        display: { xs: id ? "none" : "flex", lg: "flex" },
                        borderRight: { lg: "1px solid" },
                        borderColor: { lg: "divider" },
                        pr: { lg: 3 },
                        minHeight: { lg: "calc(100vh - 210px)" }
                    }}
                >
                    <TextField
                        placeholder="Найти документ"
                        value={search}
                        onChange={(event) =>
                            setParams(event.target.value ? { q: event.target.value } : {}, { replace: true })
                        }
                        slotProps={{
                            htmlInput: { "aria-label": "Найти документ" },
                            input: {
                                startAdornment: <SearchRounded sx={{ mr: 1, color: "text.disabled", fontSize: 18 }} />
                            }
                        }}
                    />
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="caption" fontWeight={650} color="text.secondary">
                            {archive ? "Архив" : "Все документы"} · {visible.length}
                        </Typography>
                        <Tooltip title="Действия с библиотекой">
                            <IconButton
                                size="small"
                                aria-label="Действия с библиотекой"
                                onClick={(event) => setMenu(event.currentTarget)}
                            >
                                <MoreHorizRounded fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                    <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
                        <MenuItem
                            onClick={() => {
                                setArchive(!archive);
                                setMenu(null);
                            }}
                        >
                            {archive ? "Открыть документы" : "Открыть архив"}
                        </MenuItem>
                        <MenuItem
                            disabled={!canCreate || importing}
                            onClick={() => {
                                fileInput.current?.click();
                                setMenu(null);
                            }}
                        >
                            Импорт Markdown
                        </MenuItem>
                        <MenuItem component="a" href="/api/Notes/export" download onClick={() => setMenu(null)}>
                            Скачать документы .zip
                        </MenuItem>
                        <MenuItem component={Link} to="/trash?type=note" onClick={() => setMenu(null)}>
                            Корзина
                        </MenuItem>
                    </Menu>
                    <input
                        ref={fileInput}
                        type="file"
                        accept=".md,.markdown,text/markdown"
                        multiple
                        hidden
                        onChange={async (event) => {
                            const files = [...(event.target.files ?? [])];
                            event.target.value = "";
                            if (!files.length) return;
                            if (files.length > 100 || files.reduce((sum, file) => sum + file.size, 0) > 5_000_000) {
                                setFailure("Выбери до 100 файлов общим объёмом до 5 МБ.");
                                return;
                            }
                            try {
                                await importFiles({
                                    importNotesRequest: {
                                        workspaceId: ["all", "mine"].includes(scope) ? null : scope,
                                        files: await Promise.all(
                                            files.map(async (file) => ({ name: file.name, content: await file.text() }))
                                        )
                                    }
                                }).unwrap();
                                setFailure("");
                            } catch (problem) {
                                setFailure(message(problem));
                            }
                        }}
                    />
                    {(isLoading || importing) && <CircularProgress size={20} aria-label="Загрузка документов" />}
                    <List sx={{ p: 0, maxHeight: { lg: "70vh" }, overflowY: "auto" }}>
                        {tree.map(({ note, depth }) => (
                            <NoteListItem
                                key={note.id}
                                note={note}
                                depth={depth}
                                selected={note.id === id}
                                hasChildren={visible.some((item) => item.parentId === note.id)}
                                collapsed={collapsed.has(note.id)}
                                onToggle={() =>
                                    setCollapsed((previous) => {
                                        const next = new Set(previous);
                                        if (next.has(note.id)) next.delete(note.id);
                                        else next.add(note.id);
                                        return next;
                                    })
                                }
                                {...actions(note)}
                            />
                        ))}
                    </List>
                    {!isLoading && !visible.length && (
                        <Typography variant="body2" color="text.secondary">
                            {search ? "Ничего не найдено" : archive ? "Архив пуст" : "Здесь появятся твои документы"}
                        </Typography>
                    )}
                </Stack>
                <Box
                    sx={{
                        minWidth: 0,
                        width: "100%",
                        maxWidth: 840,
                        mx: "auto",
                        px: { lg: 2 },
                        display: { xs: id || !visible.length ? "block" : "none", lg: "block" }
                    }}
                >
                    {id && (
                        <Button
                            component={Link}
                            to="/notes"
                            startIcon={<ArrowBackRounded />}
                            color="inherit"
                            sx={{ display: { lg: "none" }, mb: 2 }}
                        >
                            Все документы
                        </Button>
                    )}
                    {selected ? (
                        <NoteDocument
                            key={selected.id}
                            ref={editor}
                            note={selected}
                            notes={notes}
                            focusTitle={params.get("rename") === "1"}
                            onDeleted={() => {
                                deleted();
                                navigate("/notes");
                            }}
                        />
                    ) : (
                        <Stack gap={2} sx={{ py: { xs: 2, lg: 3 } }}>
                            <DescriptionOutlined sx={{ fontSize: 32, color: "text.disabled" }} />
                            <Typography variant="h5">
                                {isLoading
                                    ? "Загружаем документы…"
                                    : id
                                      ? "Документ недоступен"
                                      : visible.length
                                        ? "Продолжить работу"
                                        : "Место для рабочих знаний"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {id
                                    ? "Возможно, документ удалён или у тебя нет доступа."
                                    : visible.length
                                      ? "Недавно изменённые документы в этом пространстве."
                                      : "Инструкции, решения и записи встреч — для себя или команды."}
                            </Typography>
                            {!id && !visible.length && canCreate && (
                                <Button
                                    variant="outlined"
                                    sx={{ alignSelf: "start" }}
                                    onClick={() => setCreateOpen(true)}
                                >
                                    Создать документ
                                </Button>
                            )}
                            {!id && (
                                <List>
                                    {[...visible]
                                        .sort((a, b) =>
                                            (b.modified ?? b.created ?? "").localeCompare(a.modified ?? a.created ?? "")
                                        )
                                        .slice(0, 6)
                                        .map((note) => (
                                            <NoteListItem key={note.id} note={note} recent {...actions(note)} />
                                        ))}
                                </List>
                            )}
                        </Stack>
                    )}
                </Box>
            </Box>
            {remove && (
                <DeleteMaterialDialog kind="note" item={remove} onClose={() => setRemove(null)} onDeleted={deleted} />
            )}
            <Snackbar
                open={!!notice}
                autoHideDuration={6000}
                onClose={() => setNotice("")}
                message={notice}
                action={
                    notice.includes("корзину") ? (
                        <Button component={Link} to="/trash?type=note" color="inherit" onClick={() => setNotice("")}>
                            Корзина
                        </Button>
                    ) : undefined
                }
            />
            {createOpen && <NewDocumentDialog onClose={() => setCreateOpen(false)} />}
        </Stack>
    );
}
