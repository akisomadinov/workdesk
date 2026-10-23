import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import LockOutlined from "@mui/icons-material/LockOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import NewDocumentDialog from "@/common/NewDocumentDialog";
import { Controller, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useAuthSessionQuery, useNotesHistoryQuery, useTeamGetQuery, useTasksGetQuery } from "@/api/autogen/workdesk";
import useNoteEditor from "@/hooks/useNotebook";
import type { NoteItem } from "@/hooks/useNotebook";
import { dateTime } from "@/common/models";
import { downloadMarkdown, linksTo } from "@/common/markdown";
import MarkdownEditor from "@/common/MarkdownEditor";
import MarkdownView from "@/common/MarkdownView";

export default function NoteDocument({ note, notes }: { note: NoteItem; notes: NoteItem[] }) {
    const editor = useNoteEditor(note);
    const { control, register, setValue } = editor.form;
    const values = useWatch({ control });
    const { data: spaces = [] } = useTeamGetQuery();
    const { data: session } = useAuthSessionQuery();
    const { data: tasks = [] } = useTasksGetQuery();
    const [menu, setMenu] = useState<HTMLElement | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [linksOpen, setLinksOpen] = useState(false);
    const [childOpen, setChildOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [archiveOpen, setArchiveOpen] = useState(false);
    const { data: history = [] } = useNotesHistoryQuery({ id: note.id }, { skip: !historyOpen });
    const navigate = useNavigate();
    const backlinks = notes.filter((other) => other.id !== note.id && linksTo(other.body, note));
    return (
        <Stack gap={2}>
            <Stack direction="row" alignItems="center" gap={1}>
                <Button
                    color="inherit"
                    size="small"
                    startIcon={values.workspaceId ? <GroupsOutlined /> : <LockOutlined />}
                    onClick={() => setSettingsOpen(true)}
                >
                    {values.workspaceId
                        ? (spaces.find((space) => space.id === values.workspaceId)?.name ?? "Команда")
                        : "Только мне"}
                </Button>
                <Typography
                    variant="caption"
                    color={editor.error ? "error" : "text.secondary"}
                    role="status"
                    sx={{ ml: "auto" }}
                >
                    {editor.status}
                </Typography>
                <IconButton aria-label="Действия с документом" onClick={(event) => setMenu(event.currentTarget)}>
                    <MoreHorizRounded />
                </IconButton>
                <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
                    <MenuItem
                        disabled={!note.canEdit}
                        onClick={() => {
                            setChildOpen(true);
                            setMenu(null);
                        }}
                    >
                        Добавить вложенный документ
                    </MenuItem>
                    <MenuItem
                        disabled={!note.canEdit}
                        onClick={() => {
                            setValue("pinned", !values.pinned, { shouldDirty: true });
                            setMenu(null);
                        }}
                    >
                        {values.pinned ? "Открепить" : "Закрепить"}
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            setSettingsOpen(true);
                            setMenu(null);
                        }}
                    >
                        Свойства и доступ
                    </MenuItem>
                    <MenuItem
                        disabled={!note.canEdit}
                        onClick={() => {
                            setLinksOpen(true);
                            setMenu(null);
                        }}
                    >
                        Связать с задачей или документом
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            setHistoryOpen(true);
                            setMenu(null);
                        }}
                    >
                        История изменений
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            downloadMarkdown(values.title ?? note.title, values.body ?? note.body);
                            setMenu(null);
                        }}
                    >
                        Скачать Markdown
                    </MenuItem>
                    <MenuItem
                        disabled={!note.canEdit}
                        onClick={() => {
                            setArchiveOpen(true);
                            setMenu(null);
                        }}
                    >
                        {note.archived ? "Вернуть из архива" : "В архив"}
                    </MenuItem>
                </Menu>
            </Stack>
            {childOpen && <NewDocumentDialog parent={note} onClose={() => setChildOpen(false)} />}
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
                variant="standard"
                placeholder="Название документа"
                slotProps={{ input: { disableUnderline: true }, htmlInput: { "aria-label": "Название документа" } }}
                sx={{ "& input": { fontSize: { xs: 27, sm: 34 }, fontWeight: 750, letterSpacing: -0.8, py: 1.5 } }}
                {...register("title")}
                disabled={!note.canEdit}
                error={!!editor.form.formState.errors.title}
                helperText={editor.form.formState.errors.title?.message}
            />
            <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
                <DialogTitle>Свойства и доступ</DialogTitle>
                <DialogContent sx={{ pt: "16px !important" }}>
                    <Stack gap={2}>
                        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                            <TextField label="Проект / папка" {...register("project")} disabled={!note.canEdit} />
                            <TextField label="Теги через запятую" {...register("tags")} disabled={!note.canEdit} />
                        </Stack>
                        <TextField
                            select
                            label="Кому доступен документ"
                            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
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
                            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
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
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={async () => {
                            if (await editor.flush()) setSettingsOpen(false);
                        }}
                    >
                        Готово
                    </Button>
                </DialogActions>
            </Dialog>
            <Controller
                control={control}
                name="body"
                render={({ field }) => (
                    <MarkdownEditor
                        value={field.value}
                        onChange={field.onChange}
                        label="Текст документа"
                        notes={notes}
                        workspaceId={values.workspaceId}
                        readOnly={!note.canEdit}
                        minHeight={460}
                    />
                )}
            />
            <Dialog open={linksOpen} onClose={() => setLinksOpen(false)}>
                <DialogTitle>Связанные материалы</DialogTitle>
                <DialogContent sx={{ pt: "16px !important" }}>
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
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLinksOpen(false)}>Готово</Button>
                </DialogActions>
            </Dialog>
            <Typography variant="caption" color="text.secondary">
                Изменено {dateTime(note.modified ?? note.created)}
            </Typography>
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
