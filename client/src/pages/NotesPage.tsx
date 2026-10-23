import { useEffect, useState } from "react";
import {
    Alert,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Box,
    Button,
    Card,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    MenuItem,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import PushPinOutlined from "@mui/icons-material/PushPinOutlined";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import { Controller, useWatch } from "react-hook-form";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
    useAuthSessionQuery,
    useNotesSaveMutation,
    useNotesImportMutation,
    useNotesHistoryQuery,
    useTeamGetQuery,
    useTasksGetQuery
} from "@/api/autogen/workdesk";
import useNoteEditor, { useNotes } from "@/hooks/useNotebook";
import type { NoteItem } from "@/hooks/useNotebook";
import { dateTime, localDate, message } from "@/common/models";
import { downloadMarkdown, linksTo, noteTemplates, noteTree } from "@/common/markdown";
import MarkdownEditor from "@/common/MarkdownEditor";
import MarkdownView from "@/common/MarkdownView";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

function NoteDocument({ note, notes }: { note: NoteItem; notes: NoteItem[] }) {
    const editor = useNoteEditor(note);
    const { control, register, setValue } = editor.form;
    const values = useWatch({ control });
    const { data: spaces = [] } = useTeamGetQuery();
    const { data: session } = useAuthSessionQuery();
    const { data: tasks = [] } = useTasksGetQuery();
    const [historyOpen, setHistoryOpen] = useState(false);
    const [archiveOpen, setArchiveOpen] = useState(false);
    const { data: history = [] } = useNotesHistoryQuery({ id: note.id }, { skip: !historyOpen });
    const navigate = useNavigate();
    const backlinks = notes.filter((other) => other.id !== note.id && linksTo(other.body, note));
    return (
        <Stack gap={2}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                <Typography
                    variant="caption"
                    sx={{ mr: "auto" }}
                    color={editor.error ? "error" : "text.secondary"}
                    role="status"
                >
                    {editor.status}
                </Typography>
                <IconButton
                    aria-label={values.pinned ? "Открепить заметку" : "Закрепить заметку"}
                    disabled={!note.canEdit}
                    color={values.pinned ? "primary" : "default"}
                    onClick={() => setValue("pinned", !values.pinned, { shouldDirty: true })}
                >
                    <PushPinOutlined />
                </IconButton>
                <Button size="small" startIcon={<HistoryRounded />} onClick={() => setHistoryOpen(true)}>
                    История
                </Button>
                <Button
                    size="small"
                    onClick={() => downloadMarkdown(values.title ?? note.title, values.body ?? note.body)}
                >
                    .md
                </Button>
                <Button size="small" disabled={!note.canEdit} onClick={() => setArchiveOpen(true)}>
                    {note.archived ? "Вернуть" : "В архив"}
                </Button>
            </Stack>
            {editor.error && <Alert severity="error">{editor.error}</Alert>}
            {editor.recovery && (
                <Alert
                    severity="warning"
                    action={
                        <Stack>
                            <Button size="small" onClick={editor.recover}>
                                Восстановить
                            </Button>
                            <Button size="small" onClick={editor.discardRecovery}>
                                Удалить
                            </Button>
                        </Stack>
                    }
                >
                    Есть черновик, который не попал в базу.
                </Alert>
            )}
            <TextField
                label="Название заметки"
                {...register("title")}
                disabled={!note.canEdit}
                error={!!editor.form.formState.errors.title}
                helperText={editor.form.formState.errors.title?.message}
            />
            <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                    <Typography variant="body2">
                        Настройки страницы ·{" "}
                        {values.workspaceId
                            ? (spaces.find((space) => space.id === values.workspaceId)?.name ?? "Общее пространство")
                            : "Только мне"}
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Stack gap={2}>
                        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                            <TextField label="Проект / папка" {...register("project")} disabled={!note.canEdit} />
                            <TextField label="Теги через запятую" {...register("tags")} disabled={!note.canEdit} />
                        </Stack>
                        <TextField
                            select
                            label="Кому доступна заметка"
                            value={values.workspaceId ?? ""}
                            {...register("workspaceId")}
                            onChange={(event) => {
                                setValue("workspaceId", event.target.value, { shouldDirty: true });
                                setValue("parentId", "", { shouldDirty: true });
                            }}
                            disabled={!note.canEdit || note.ownerId !== session?.userId}
                            helperText="В общем пространстве участники увидят весь текст и историю этой заметки."
                        >
                            <MenuItem value="">Только мне</MenuItem>
                            {spaces
                                .filter((space) => space.role !== "reader" || space.id === note.workspaceId)
                                .map((space) => (
                                    <MenuItem key={space.id} value={space.id}>
                                        {space.name}
                                    </MenuItem>
                                ))}
                        </TextField>
                        <TextField
                            select
                            label="Родительская страница"
                            value={values.parentId ?? ""}
                            {...register("parentId")}
                            disabled={!note.canEdit}
                        >
                            <MenuItem value="">Верхний уровень</MenuItem>
                            {notes
                                .filter(
                                    (item) =>
                                        item.id !== note.id &&
                                        !item.archived &&
                                        (item.workspaceId ?? "") === (values.workspaceId ?? "")
                                )
                                .map((item) => (
                                    <MenuItem key={item.id} value={item.id}>
                                        {item.title}
                                    </MenuItem>
                                ))}
                        </TextField>
                    </Stack>
                </AccordionDetails>
            </Accordion>
            <Controller
                control={control}
                name="body"
                render={({ field }) => (
                    <MarkdownEditor
                        value={field.value}
                        onChange={field.onChange}
                        label="Текст заметки"
                        notes={notes}
                        workspaceId={values.workspaceId}
                        readOnly={!note.canEdit}
                        minHeight={390}
                    />
                )}
            />
            {note.canEdit && (
                <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                    <TextField
                        select
                        label="Вставить ссылку на заметку"
                        value=""
                        onChange={(event) => {
                            const target = notes.find((item) => item.id === event.target.value);
                            if (target)
                                setValue(
                                    "body",
                                    editor.form.getValues("body") + `\n[[note:${target.id}|${target.title}]]\n`,
                                    { shouldDirty: true }
                                );
                        }}
                    >
                        <MenuItem value="" disabled>
                            Выбери заметку
                        </MenuItem>
                        {notes
                            .filter((item) => item.id !== note.id && !item.archived)
                            .map((item) => (
                                <MenuItem key={item.id} value={item.id}>
                                    {item.title}
                                </MenuItem>
                            ))}
                    </TextField>
                    <TextField
                        select
                        label="Вставить ссылку на задачу"
                        value=""
                        onChange={(event) => {
                            const task = tasks.find((item) => item.id === event.target.value);
                            if (task)
                                setValue(
                                    "body",
                                    editor.form.getValues("body") + `\n[${task.title}](/board?task=${task.id})\n`,
                                    { shouldDirty: true }
                                );
                        }}
                    >
                        <MenuItem value="" disabled>
                            Выбери задачу
                        </MenuItem>
                        {tasks
                            .filter((task) => !task.archived)
                            .map((task) => (
                                <MenuItem key={task.id} value={task.id}>
                                    {task.title}
                                </MenuItem>
                            ))}
                    </TextField>
                </Stack>
            )}
            <Stack direction="row" justifyContent="space-between" gap={2}>
                <Typography variant="caption" color="text.secondary">
                    {(values.body ?? "").length} символов · обновлено {dateTime(note.modified ?? note.created)}
                </Typography>
                {note.canEdit && (
                    <Button size="small" onClick={() => void editor.flush()}>
                        Сохранить сейчас
                    </Button>
                )}
            </Stack>
            {backlinks.length > 0 && (
                <Box sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}>
                    <Typography variant="h6">Ссылаются на эту заметку</Typography>
                    {backlinks.map((other) => (
                        <Button
                            key={other.id}
                            onClick={async () => {
                                if (await editor.flush()) navigate(`/notes/${other.id}`);
                            }}
                        >
                            {other.title}
                        </Button>
                    ))}
                </Box>
            )}
            <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md">
                <DialogTitle>История заметки</DialogTitle>
                <DialogContent>
                    <Stack gap={2}>
                        {history.length === 0 && (
                            <Typography color="text.secondary">
                                Предыдущие версии появятся после изменения текста.
                            </Typography>
                        )}
                        {history.map((version) => (
                            <Card variant="outlined" key={version.id} sx={{ p: 2 }}>
                                <Typography variant="caption">
                                    Версия {version.number} · {dateTime(version.created)}
                                </Typography>
                                <Box sx={{ maxHeight: 220, overflow: "auto" }}>
                                    <MarkdownView value={version.body ?? ""} />
                                </Box>
                                {note.canEdit && (
                                    <Button
                                        onClick={() => {
                                            setValue("body", version.body ?? "", { shouldDirty: true });
                                            setValue("title", version.title ?? note.title, { shouldDirty: true });
                                            setHistoryOpen(false);
                                        }}
                                    >
                                        Восстановить эту версию
                                    </Button>
                                )}
                            </Card>
                        ))}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHistoryOpen(false)}>Закрыть</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={archiveOpen} onClose={() => setArchiveOpen(false)}>
                <DialogTitle>{note.archived ? "Вернуть заметку?" : "Убрать заметку в архив?"}</DialogTitle>
                <DialogContent>Текст и история сохранятся.</DialogContent>
                <DialogActions>
                    <Button onClick={() => setArchiveOpen(false)}>Отмена</Button>
                    <Button
                        onClick={async () => {
                            setValue("archived", !note.archived, { shouldDirty: true });
                            if (await editor.flush()) {
                                setArchiveOpen(false);
                                navigate("/notes");
                            }
                        }}
                    >
                        Подтвердить
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
export default function NotesPage() {
    const { id } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { notes, isLoading, error } = useNotes();
    const { scope } = useWorkspaceStore();
    const { data: session } = useAuthSessionQuery();
    const { data: spaces = [] } = useTeamGetQuery();
    const [save] = useNotesSaveMutation();
    const [importFiles] = useNotesImportMutation();
    const [search, setSearch] = useState(params.get("q") ?? "");
    useEffect(() => setSearch(params.get("q") ?? ""), [params]);
    const [archive, setArchive] = useState(false);
    const [failure, setFailure] = useState("");
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
    async function create(template: keyof typeof noteTemplates | "daily", parent?: NoteItem) {
        const dailyTitle = `Ежедневник · ${localDate()}`;
        const existing =
            template === "daily"
                ? notes.find(
                      (note) =>
                          note.ownerId === session?.userId &&
                          !note.workspaceId &&
                          note.title === dailyTitle &&
                          !note.archived
                  )
                : null;
        if (existing) {
            navigate(`/notes/${existing.id}`);
            return;
        }
        const source =
            template === "daily"
                ? {
                      title: dailyTitle,
                      body: `# ${dailyTitle}\n\n## Главное на сегодня\n\n- [ ] \n\n## Что сделал\n\n- \n\n## На чём остановился\n\n\n## Завтра\n\n- [ ] \n`
                  }
                : noteTemplates[template];
        try {
            const result = await save({
                saveNoteRequest: {
                    ...source,
                    workspaceId: parent
                        ? parent.workspaceId
                        : template === "daily" || ["all", "mine"].includes(scope)
                          ? null
                          : scope,
                    parentId: parent?.id
                }
            }).unwrap();
            navigate(`/notes/${result.id}`);
            setFailure("");
        } catch (problem) {
            setFailure(message(problem));
        }
    }
    return (
        <Stack gap={3}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
                <Box>
                    <Typography variant="h4">Документация</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Markdown, рабочие записи и связанные знания.
                    </Typography>
                </Box>
                <Stack direction="row" gap={1} flexWrap="wrap">
                    {selected?.canEdit && (
                        <Button onClick={() => void create("blank", selected)}>Вложенная страница</Button>
                    )}
                    <Button onClick={() => void create("daily")}>Ежедневник</Button>
                    <Button component="a" href="/api/Notes/export" download>
                        Экспорт .md
                    </Button>
                    {canCreate && (
                        <Button component="label">
                            Импорт .md
                            <input
                                type="file"
                                accept=".md,.markdown,text/markdown"
                                multiple
                                hidden
                                onChange={async (event) => {
                                    const files = [...(event.target.files ?? [])];
                                    event.target.value = "";
                                    if (!files.length) return;
                                    if (
                                        files.length > 100 ||
                                        files.reduce((sum, file) => sum + file.size, 0) > 5_000_000
                                    ) {
                                        setFailure("Выбери до 100 файлов общим объёмом до 5 МБ.");
                                        return;
                                    }
                                    try {
                                        await importFiles({
                                            importNotesRequest: {
                                                workspaceId: ["all", "mine"].includes(scope) ? null : scope,
                                                files: await Promise.all(
                                                    files.map(async (file) => ({
                                                        name: file.name,
                                                        content: await file.text()
                                                    }))
                                                )
                                            }
                                        }).unwrap();
                                    } catch (problem) {
                                        setFailure(message(problem));
                                    }
                                }}
                            />
                        </Button>
                    )}
                    <Button
                        disabled={!canCreate}
                        variant="contained"
                        startIcon={<AddRounded />}
                        onClick={() => void create("blank")}
                    >
                        Заметка
                    </Button>
                </Stack>
            </Stack>
            {(failure || error) && <Alert severity="error">{failure || message(error)}</Alert>}
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", lg: "270px minmax(0, 1fr)" },
                    gap: 3,
                    alignItems: "start"
                }}
            >
                <Stack gap={1.5}>
                    <TextField
                        label="Поиск в документации"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    <Stack direction="row" gap={1}>
                        <Chip
                            label="Заметки"
                            onClick={() => setArchive(false)}
                            color={!archive ? "primary" : "default"}
                        />
                        <Chip label="Архив" onClick={() => setArchive(true)} color={archive ? "primary" : "default"} />
                    </Stack>
                    <List sx={{ maxHeight: { lg: "65vh" }, overflowY: "auto" }}>
                        {noteTree(visible).map(({ note, depth }) => (
                            <ListItemButton
                                key={note.id}
                                selected={note.id === id}
                                onClick={() => navigate(`/notes/${note.id}`)}
                                sx={{
                                    borderRadius: 2,
                                    mb: 0.5,
                                    pl: 2 + Math.min(depth, 8) * 1.5,
                                    borderLeft: depth ? 1 : 0,
                                    borderColor: "divider"
                                }}
                            >
                                <ListItemText
                                    primary={`${note.pinned ? "• " : ""}${note.title}`}
                                    secondary={note.project || (note.workspaceId ? "Общая заметка" : "Личная заметка")}
                                    primaryTypographyProps={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        sx: { overflowWrap: "anywhere" }
                                    }}
                                />
                            </ListItemButton>
                        ))}
                    </List>
                    {canCreate && (
                        <TextField
                            select
                            label="Создать по шаблону"
                            value=""
                            onChange={(event) => void create(event.target.value as keyof typeof noteTemplates)}
                        >
                            {Object.entries(noteTemplates).map(([key, value]) => (
                                <MenuItem key={key} value={key}>
                                    {value.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}
                </Stack>
                <Box
                    sx={{
                        p: { xs: 1.5, sm: 3 },
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 3,
                        bgcolor: "background.paper",
                        minWidth: 0
                    }}
                >
                    {selected ? (
                        <NoteDocument key={selected.id} note={selected} notes={notes} />
                    ) : (
                        <Stack gap={2} sx={{ py: 5, px: 2 }}>
                            <Typography variant="h5">
                                {isLoading
                                    ? "Загружаем заметки…"
                                    : id
                                      ? "Заметка недоступна"
                                      : "Рабочие знания рядом с задачами"}
                            </Typography>
                            <Typography color="text.secondary" variant="body2">
                                {id
                                    ? "Возможно, у тебя нет доступа к этому материалу."
                                    : "Выбери заметку слева или создай новую. Поддерживаются заголовки, списки, таблицы, чек-листы и блоки кода. Связывай записи через [[название заметки]]."}
                            </Typography>
                            {!id && canCreate && (
                                <Button sx={{ alignSelf: "start" }} onClick={() => void create("blank")}>
                                    Создать первую заметку
                                </Button>
                            )}
                        </Stack>
                    )}
                </Box>
            </Box>
        </Stack>
    );
}
