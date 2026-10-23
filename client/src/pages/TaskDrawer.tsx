import { lazy, Suspense, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Drawer,
    Divider,
    IconButton,
    Link,
    Menu,
    MenuItem,
    Stack,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography
} from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import WbSunnyOutlined from "@mui/icons-material/WbSunnyOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import { Controller, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
const MarkdownEditor = lazy(() => import("@/common/MarkdownEditor"));
import MarkdownView from "@/common/MarkdownView";
import { linksTo } from "@/common/markdown";
import { useNotes } from "@/hooks/useNotebook";
import { useTeamGetQuery } from "@/api/autogen/workdesk";
import useTaskEditor from "@/hooks/useTaskEditor";
import { dateTime, localDate, safeLink, stages } from "@/common/models";
import type { TaskItem } from "@/common/models";
import type { TaskValues } from "./validation";
import TaskPropertiesDialog from "./tasks/TaskPropertiesDialog";
import useContextMenu from "@/hooks/useContextMenu";
import DeleteMaterialDialog from "@/common/DeleteMaterialDialog";
import TaskDocuments from "./tasks/TaskDocuments";
export default function TaskDrawer({ task, onClose }: { task: TaskItem; onClose: () => void }) {
    const editor = useTaskEditor(task);
    const { notes } = useNotes();
    const { data: spaces = [] } = useTeamGetQuery();
    const navigate = useNavigate();
    const {
        register,
        control,
        setValue,
        getValues,
        formState: { errors }
    } = editor.form;
    const values = useWatch({ control });
    const [remove, setRemove] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [closeWarning, setCloseWarning] = useState(false);
    const [properties, setProperties] = useState(false);
    const menu = useContextMenu();
    const [tab, setTab] = useState<"description" | "notes" | "documents">("description");
    const [editing, setEditing] = useState(false);
    const readOnly = task.canEdit === false;
    const workspaceId = values.workspaceId || null;
    const space = spaces.find((item) => item.id === workspaceId);
    const assignee = space?.members?.find((person) => person.id === values.assigneeId);
    const ids = (values.documentIds ?? []).filter((id): id is string => !!id);
    const mentioned = notes.filter(
        (note) =>
            (note.workspaceId ?? null) === workspaceId &&
            linksTo(`${values.description ?? ""}\n${values.notes ?? ""}`, note)
    );
    const documentCount = new Set([...ids, ...mentioned.map((note) => note.id)]).size;
    const externalUrl = safeLink(task.externalUrl);
    async function close() {
        if (await editor.flush()) onClose();
        else setCloseWarning(true);
    }
    async function beforeNavigate() {
        if (!(await editor.flush())) return false;
        onClose();
        return true;
    }
    function setStage(stage: TaskValues["stage"]) {
        setValue("stage", stage, { shouldDirty: true, shouldValidate: true });
    }
    const textField = tab === "notes" ? "notes" : "description";
    const canEditText = !readOnly && (tab === "notes" || !task.connectionId);
    const text = values[textField] ?? "";
    return (
        <>
            <Drawer
                anchor="right"
                open
                onClose={() => void close()}
                PaperProps={{
                    role: "dialog",
                    "aria-modal": true,
                    "aria-label": "Карточка задачи",
                    sx: { width: { xs: "100%", md: 800 }, maxWidth: "100%" }
                }}
            >
                <Stack
                    onContextMenu={readOnly ? undefined : menu.triggerProps.onContextMenu}
                    onKeyDown={readOnly ? undefined : menu.triggerProps.onKeyDown}
                    direction="row"
                    alignItems="center"
                    gap={1}
                    sx={{
                        px: { xs: 2, sm: 4 },
                        py: 1.5,
                        borderBottom: 1,
                        borderColor: "divider",
                        position: "sticky",
                        top: 0,
                        bgcolor: "background.paper",
                        zIndex: 2
                    }}
                >
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>
                        {workspaceId ? (space?.name ?? "Командная задача") : "Личная задача"}
                    </Typography>
                    <Typography variant="caption" color={editor.error ? "error.main" : "text.secondary"} role="status">
                        {readOnly ? "Только чтение" : editor.status}
                    </Typography>
                    <Tooltip title="Свойства задачи">
                        <IconButton aria-label="Свойства задачи" onClick={() => setProperties(true)}>
                            <TuneRounded fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    {!readOnly && (
                        <IconButton
                            aria-label="Другие действия"
                            aria-haspopup="menu"
                            aria-expanded={menu.open}
                            onClick={menu.openButton}
                        >
                            <MoreHorizRounded />
                        </IconButton>
                    )}
                    <IconButton aria-label="Закрыть карточку" onClick={() => void close()}>
                        <CloseRounded />
                    </IconButton>
                </Stack>
                <Stack gap={3} sx={{ px: { xs: 2, sm: 4 }, py: 3, minWidth: 0 }}>
                    {editor.error && (
                        <Alert
                            severity="error"
                            action={
                                <Button size="small" onClick={() => void editor.flush()}>
                                    Повторить
                                </Button>
                            }
                        >
                            {editor.error}
                        </Alert>
                    )}
                    {!readOnly && editor.recovery && (
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
                            Найден несохранённый черновик этой задачи.
                        </Alert>
                    )}
                    <Box>
                        {(values.project || task.connectionId) && (
                            <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                                    {values.project}
                                </Typography>
                                {externalUrl && (
                                    <Link
                                        href={externalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={{
                                            fontSize: 12,
                                            display: "inline-flex",
                                            gap: 0.5,
                                            alignItems: "center",
                                            flexShrink: 0
                                        }}
                                    >
                                        В трекере <OpenInNewRounded sx={{ fontSize: 13 }} />
                                    </Link>
                                )}
                            </Stack>
                        )}
                        {readOnly || task.connectionId ? (
                            <Typography
                                variant="h5"
                                sx={{ fontSize: { xs: 24, sm: 28 }, lineHeight: 1.35, overflowWrap: "anywhere" }}
                            >
                                {task.title}
                            </Typography>
                        ) : (
                            <TextField
                                variant="standard"
                                multiline
                                {...register("title")}
                                error={!!errors.title}
                                helperText={errors.title?.message}
                                slotProps={{
                                    input: { disableUnderline: true },
                                    htmlInput: { "aria-label": "Название задачи" }
                                }}
                                sx={{
                                    "& .MuiInputBase-root": {
                                        fontSize: { xs: 24, sm: 28 },
                                        fontWeight: 700,
                                        lineHeight: 1.35
                                    }
                                }}
                            />
                        )}
                    </Box>
                    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                        <TextField
                            select
                            value={values.stage ?? "inbox"}
                            {...register("stage")}
                            disabled={readOnly}
                            slotProps={{ select: { inputProps: { "aria-label": "Статус задачи" } } }}
                            sx={{ width: "auto", minWidth: 155 }}
                        >
                            {stages.map((stage) => (
                                <MenuItem value={stage.id} key={stage.id}>
                                    {stage.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        {!readOnly && (
                            <Button
                                color={values.plannedFor === localDate() ? "primary" : "inherit"}
                                startIcon={<WbSunnyOutlined />}
                                aria-pressed={values.plannedFor === localDate()}
                                onClick={() =>
                                    setValue("plannedFor", values.plannedFor === localDate() ? "" : localDate(), {
                                        shouldDirty: true
                                    })
                                }
                            >
                                На сегодня
                            </Button>
                        )}
                        {!readOnly && !task.archived && (
                            <Button
                                variant={values.stage === "done" ? "outlined" : "contained"}
                                startIcon={values.stage === "doing" ? <CheckRounded /> : <ArrowForwardRounded />}
                                onClick={() => setStage(values.stage === "doing" ? "done" : "doing")}
                                sx={{ ml: { sm: "auto" } }}
                            >
                                {values.stage === "doing"
                                    ? "Завершить"
                                    : values.stage === "done"
                                      ? "Вернуть в работу"
                                      : "Начать"}
                            </Button>
                        )}
                    </Stack>
                    {(assignee ||
                        values.milestone ||
                        values.priority === "urgent" ||
                        values.priority === "high" ||
                        task.archived) && (
                        <Stack direction="row" gap={1} flexWrap="wrap">
                            {assignee && (
                                <Chip
                                    variant="outlined"
                                    size="small"
                                    label={assignee.name}
                                    onClick={() => setProperties(true)}
                                />
                            )}
                            {values.milestone && (
                                <Chip
                                    variant="outlined"
                                    size="small"
                                    label={values.milestone}
                                    onClick={() => setProperties(true)}
                                />
                            )}
                            {(values.priority === "urgent" || values.priority === "high") && (
                                <Chip
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                    label={values.priority === "urgent" ? "Срочно" : "Высокий приоритет"}
                                    onClick={() => setProperties(true)}
                                />
                            )}
                            {task.archived && <Chip label="В архиве" size="small" />}
                        </Stack>
                    )}
                    {values.stage !== "done" && (
                        <Stack
                            gap={2}
                            sx={{
                                p: 2.5,
                                bgcolor: values.stage === "waiting" ? "warning.light" : "background.default",
                                borderRadius: 1.5
                            }}
                        >
                            <Box>
                                <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 0.75 }}>
                                    <ArrowForwardRounded sx={{ fontSize: 18, color: "primary.main" }} />
                                    <Typography variant="body2" fontWeight={650}>
                                        Следующий шаг
                                    </Typography>
                                </Stack>
                                {readOnly ? (
                                    <Typography
                                        variant="body2"
                                        sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                                    >
                                        {values.nextStep || "Пока не указан"}
                                    </Typography>
                                ) : (
                                    <TextField
                                        variant="standard"
                                        multiline
                                        placeholder="Одно действие, с которого продолжишь работу"
                                        {...register("nextStep")}
                                        error={!!errors.nextStep}
                                        helperText={errors.nextStep?.message}
                                        slotProps={{
                                            input: { disableUnderline: true },
                                            htmlInput: { "aria-label": "Следующий шаг" }
                                        }}
                                        sx={{ "& .MuiInputBase-root": { fontSize: 14, lineHeight: 1.65 } }}
                                    />
                                )}
                            </Box>
                            {values.stage === "waiting" && (
                                <Box sx={{ borderTop: 1, borderColor: "divider", pt: 1.5 }}>
                                    <Typography variant="body2" fontWeight={650} sx={{ mb: 0.5 }}>
                                        Что мешает продолжить
                                    </Typography>
                                    {readOnly ? (
                                        <Typography
                                            variant="body2"
                                            sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                                        >
                                            {values.blocker || "Пока не указано"}
                                        </Typography>
                                    ) : (
                                        <TextField
                                            multiline
                                            variant="standard"
                                            placeholder="Чей ответ или какое решение нужно"
                                            {...register("blocker")}
                                            error={!!errors.blocker}
                                            helperText={errors.blocker?.message}
                                            slotProps={{
                                                input: { disableUnderline: true },
                                                htmlInput: { "aria-label": "Что мешает продолжить" }
                                            }}
                                            sx={{ "& .MuiInputBase-root": { fontSize: 14 } }}
                                        />
                                    )}
                                </Box>
                            )}
                        </Stack>
                    )}
                    <Box>
                        <Tabs
                            value={tab}
                            onChange={(_, value: typeof tab) => {
                                setTab(value);
                                setEditing(false);
                            }}
                            variant="scrollable"
                            scrollButtons="auto"
                            aria-label="Содержимое задачи"
                            sx={{ borderBottom: 1, borderColor: "divider", mb: 2.5 }}
                        >
                            <Tab
                                id="task-tab-description"
                                aria-controls="task-panel-description"
                                value="description"
                                label="Описание"
                            />
                            <Tab id="task-tab-notes" aria-controls="task-panel-notes" value="notes" label="Заметки" />
                            <Tab
                                id="task-tab-documents"
                                aria-controls="task-panel-documents"
                                value="documents"
                                label={`Документы${documentCount ? ` · ${documentCount}` : ""}`}
                            />
                        </Tabs>
                        <Box
                            role="tabpanel"
                            id={`task-panel-${tab}`}
                            aria-labelledby={`task-tab-${tab}`}
                            sx={{ minHeight: 280, pb: 3 }}
                        >
                            {tab === "documents" ? (
                                <TaskDocuments
                                    task={{
                                        ...task,
                                        title: values.title ?? task.title,
                                        project: values.project ?? "",
                                        workspaceId
                                    }}
                                    notes={notes}
                                    ids={ids}
                                    mentioned={mentioned}
                                    onChange={(value) =>
                                        setValue("documentIds", value, { shouldDirty: true, shouldValidate: true })
                                    }
                                    beforeCreate={editor.flush}
                                    onCreated={async (id) => {
                                        setValue("documentIds", [...getValues("documentIds"), id], {
                                            shouldDirty: true,
                                            shouldValidate: true
                                        });
                                        await editor.flush();
                                    }}
                                    onOpen={async (id) => {
                                        if (await beforeNavigate()) navigate(`/notes/${id}`);
                                    }}
                                />
                            ) : (
                                <Stack gap={2}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                                        <Typography variant="body2" color="text.secondary">
                                            {tab === "notes"
                                                ? "Что сделано, что проверено и о чём нужно помнить."
                                                : task.connectionId
                                                  ? "Описание обновляется из трекера."
                                                  : "Результат, который нужно получить, и условия задачи."}
                                        </Typography>
                                        {canEditText && (
                                            <Button
                                                size="small"
                                                color="inherit"
                                                startIcon={editing ? <CheckRounded /> : <EditOutlined />}
                                                sx={{ flexShrink: 0 }}
                                                onClick={() => setEditing(!editing)}
                                            >
                                                {editing ? "Готово" : text ? "Изменить" : "Написать"}
                                            </Button>
                                        )}
                                    </Stack>
                                    {editing && canEditText ? (
                                        <Controller
                                            control={control}
                                            name={textField}
                                            render={({ field }) => (
                                                <Suspense
                                                    fallback={
                                                        <Typography color="text.secondary">
                                                            Открываем редактор…
                                                        </Typography>
                                                    }
                                                >
                                                    <MarkdownEditor
                                                        key={textField}
                                                        label={
                                                            tab === "notes" ? "Заметки по работе" : "Описание задачи"
                                                        }
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        notes={notes}
                                                        workspaceId={workspaceId}
                                                        minHeight={260}
                                                    />
                                                </Suspense>
                                            )}
                                        />
                                    ) : text ? (
                                        <MarkdownView
                                            value={text}
                                            notes={notes}
                                            workspaceId={workspaceId}
                                            beforeNavigate={beforeNavigate}
                                        />
                                    ) : (
                                        <Box
                                            sx={{
                                                py: 5,
                                                textAlign: "center",
                                                bgcolor: "background.default",
                                                borderRadius: 1.5
                                            }}
                                        >
                                            <Typography variant="body2" color="text.secondary">
                                                {tab === "notes"
                                                    ? "Здесь можно вести ход работы и сохранять выводы"
                                                    : "Добавь контекст, чтобы к задаче было легче вернуться"}
                                            </Typography>
                                            {canEditText && (
                                                <Button sx={{ mt: 1 }} onClick={() => setEditing(true)}>
                                                    {tab === "notes" ? "Добавить заметки" : "Добавить описание"}
                                                </Button>
                                            )}
                                        </Box>
                                    )}
                                    {errors[textField] && <Alert severity="error">{errors[textField]?.message}</Alert>}
                                    {tab === "description" && task.connectionId && (
                                        <Typography variant="caption" color="text.secondary">
                                            {task.externalState === "closed"
                                                ? "Закрыта в трекере"
                                                : "Открыта в трекере"}{" "}
                                            · обновлено {dateTime(task.sourceUpdated)}
                                        </Typography>
                                    )}
                                </Stack>
                            )}
                        </Box>
                    </Box>
                </Stack>
            </Drawer>
            <Menu {...menu.menuProps}>
                <MenuItem
                    onClick={() => {
                        menu.close();
                        void editor.flush();
                    }}
                >
                    Сохранить сейчас
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        menu.close();
                        setConfirm(true);
                    }}
                >
                    {task.archived ? "Вернуть из архива" : "В архив"}
                </MenuItem>
                <Divider />
                <MenuItem
                    sx={{ color: "error.main" }}
                    onClick={() => {
                        menu.close();
                        setRemove(true);
                    }}
                >
                    Удалить
                </MenuItem>
            </Menu>
            {properties && <TaskPropertiesDialog task={task} form={editor.form} onClose={() => setProperties(false)} />}
            {remove && (
                <DeleteMaterialDialog
                    kind="task"
                    item={task}
                    prepare={editor.flush}
                    getRevision={() => editor.revision.current}
                    onClose={() => setRemove(false)}
                    onDeleted={onClose}
                />
            )}
            <Dialog open={confirm} onClose={() => setConfirm(false)}>
                <DialogTitle>{task.archived ? "Вернуть задачу?" : "Убрать задачу в архив?"}</DialogTitle>
                <DialogContent>Описание, заметки и связанные документы сохранятся.</DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirm(false)}>Отмена</Button>
                    <Button
                        onClick={async () => {
                            const success = await editor.archive();
                            setConfirm(false);
                            if (success) onClose();
                        }}
                    >
                        {task.archived ? "Вернуть" : "В архив"}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={closeWarning} onClose={() => setCloseWarning(false)}>
                <DialogTitle>Изменения ещё не сохранены</DialogTitle>
                <DialogContent>
                    {editor.hasDraft
                        ? "Черновик сохранён в этом браузере. Можно закрыть карточку и восстановить его при следующем открытии."
                        : "Не закрывай карточку, пока изменения не будут сохранены. Можно скопировать текст перед повторной попыткой."}
                </DialogContent>
                <DialogActions>
                    {editor.hasDraft && <Button onClick={onClose}>Закрыть с черновиком</Button>}
                    <Button onClick={() => setCloseWarning(false)}>Продолжить редактирование</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
