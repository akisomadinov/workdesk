import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Drawer,
    IconButton,
    Link,
    MenuItem,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import { Controller, useWatch } from "react-hook-form";
import MarkdownEditor from "@/common/MarkdownEditor";
import MarkdownView from "@/common/MarkdownView";
import { useNotes } from "@/hooks/useNotebook";
import { useAuthSessionQuery, useTeamGetQuery } from "@/api/autogen/workdesk";
import useTaskEditor from "@/hooks/useTaskEditor";
import { dateTime, localDate, priorities, safeLink, stages } from "@/common/models";
import type { TaskItem } from "@/common/models";
export default function TaskDrawer({ task, onClose }: { task: TaskItem; onClose: () => void }) {
    const editor = useTaskEditor(task);
    const { notes } = useNotes();
    const { data: spaces = [] } = useTeamGetQuery();
    const { data: session } = useAuthSessionQuery();
    const {
        register,
        control,
        setValue,
        formState: { errors }
    } = editor.form;
    const values = useWatch({ control });
    const [confirm, setConfirm] = useState(false);
    const [closeWarning, setCloseWarning] = useState(false);
    async function close() {
        if (await editor.flush()) onClose();
        else setCloseWarning(true);
    }
    if (task.canEdit === false)
        return (
            <Drawer anchor="right" open onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 680 }, p: 3 } }}>
                <Stack gap={2}>
                    <Stack direction="row" justifyContent="space-between">
                        <Chip label="Только чтение" />
                        <IconButton aria-label="Закрыть карточку" onClick={onClose}>
                            <CloseRounded />
                        </IconButton>
                    </Stack>
                    <Typography variant="h5">{task.title}</Typography>
                    <Typography variant="h6">Заметки</Typography>
                    <MarkdownView value={task.notes} notes={notes} workspaceId={task.workspaceId} />
                    <Typography variant="h6">Описание</Typography>
                    <MarkdownView value={task.description} notes={notes} workspaceId={task.workspaceId} />
                </Stack>
            </Drawer>
        );
    return (
        <>
            <Drawer
                anchor="right"
                open
                onClose={() => void close()}
                PaperProps={{ sx: { width: { xs: "100%", sm: 620 }, p: { xs: 2.5, sm: 4 } } }}
            >
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                    <Chip size="small" label={task.connectionId ? "Из трекера · личные записи" : "Личная задача"} />
                    <IconButton aria-label="Закрыть карточку" onClick={() => void close()}>
                        <CloseRounded />
                    </IconButton>
                </Stack>
                <Stack gap={2.5}>
                    <Typography variant="h5" sx={{ overflowWrap: "anywhere" }}>
                        {task.title}
                    </Typography>
                    <Typography variant="caption" color={editor.error ? "error" : "text.secondary"} role="status">
                        {editor.status} · создана {dateTime(task.created)}
                    </Typography>
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
                            Найден черновик, который не был записан в базу. Можно восстановить его в карточку.
                        </Alert>
                    )}
                    {!task.connectionId && (
                        <TextField
                            label="Название"
                            {...register("title")}
                            error={!!errors.title}
                            helperText={errors.title?.message}
                        />
                    )}
                    <TextField
                        select
                        label="Пространство"
                        value={values.workspaceId ?? ""}
                        {...register("workspaceId")}
                        onChange={(event) => {
                            setValue("workspaceId", event.target.value, { shouldDirty: true });
                            setValue("assigneeId", "", { shouldDirty: true });
                        }}
                        disabled={task.ownerId !== session?.userId}
                        helperText="Участники общего пространства увидят описание и заметки задачи."
                    >
                        <MenuItem value="">Только мне</MenuItem>
                        {spaces
                            .filter((space) => space.role !== "reader" || space.id === task.workspaceId)
                            .map((space) => (
                                <MenuItem key={space.id} value={space.id}>
                                    {space.name}
                                </MenuItem>
                            ))}
                    </TextField>
                    <TextField
                        label="Milestone"
                        {...register("milestone")}
                        placeholder={task.externalMilestone || "Например: Версия 1.0"}
                        helperText={
                            task.externalMilestone
                                ? `В трекере: ${task.externalMilestone}`
                                : "Используется для итогов по этапу"
                        }
                    />
                    {!!values.workspaceId && (
                        <TextField
                            select
                            label="Исполнитель"
                            value={values.assigneeId ?? ""}
                            {...register("assigneeId")}
                        >
                            <MenuItem value="">Не назначен</MenuItem>
                            {spaces
                                .find((space) => space.id === values.workspaceId)
                                ?.members?.map((person) => (
                                    <MenuItem key={person.id} value={person.id}>
                                        {person.name}
                                    </MenuItem>
                                ))}
                        </TextField>
                    )}
                    {!task.connectionId && (
                        <TextField
                            label="Проект"
                            {...register("project")}
                            error={!!errors.project}
                            helperText={errors.project?.message}
                        />
                    )}
                    <Stack direction="row" gap={1.5}>
                        <TextField select label="На моей доске" value={values.stage ?? "inbox"} {...register("stage")}>
                            {stages.map((x) => (
                                <MenuItem value={x.id} key={x.id}>
                                    {x.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label="Приоритет"
                            value={values.priority ?? "normal"}
                            {...register("priority")}
                        >
                            {priorities.map((x) => (
                                <MenuItem value={x.id} key={x.id}>
                                    {x.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Stack>
                    <Stack direction="row" gap={1} alignItems="center">
                        <TextField
                            type="date"
                            label="Запланировано на"
                            slotProps={{ inputLabel: { shrink: true } }}
                            {...register("plannedFor")}
                        />
                        <Button
                            sx={{ flexShrink: 0 }}
                            onClick={() =>
                                setValue("plannedFor", values.plannedFor === localDate() ? "" : localDate(), {
                                    shouldDirty: true
                                })
                            }
                        >
                            {values.plannedFor === localDate() ? "Убрать с сегодня" : "На сегодня"}
                        </Button>
                    </Stack>
                    <TextField
                        label="Следующий шаг"
                        multiline
                        minRows={2}
                        placeholder="С чего продолжить, когда вернёшься к задаче"
                        {...register("nextStep")}
                        error={!!errors.nextStep}
                        helperText={errors.nextStep?.message}
                    />
                    {values.stage === "waiting" && (
                        <TextField label="Что мешает / кого жду" multiline minRows={2} {...register("blocker")} />
                    )}
                    <Divider />
                    <Box>
                        <Typography variant="h6" sx={{ mb: 0.5 }}>
                            Мои заметки
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Что сделано, что проверено и о чём нужно помнить.
                        </Typography>
                    </Box>
                    <Controller
                        control={control}
                        name="notes"
                        render={({ field }) => (
                            <MarkdownEditor
                                label="Заметки по работе"
                                value={field.value}
                                onChange={field.onChange}
                                notes={notes}
                                workspaceId={values.workspaceId}
                            />
                        )}
                    />
                    <Divider />
                    <Typography variant="h6">Описание задачи</Typography>
                    {task.connectionId ? (
                        <>
                            <MarkdownView value={task.description} notes={notes} workspaceId={task.workspaceId} />
                            <Typography variant="caption" color="text.secondary">
                                Статус в трекере: {task.externalState} · обновлено {dateTime(task.sourceUpdated)}
                            </Typography>
                            {safeLink(task.externalUrl) && (
                                <Link
                                    href={safeLink(task.externalUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{ display: "flex", gap: 1, alignItems: "center" }}
                                >
                                    Открыть в трекере <OpenInNewRounded fontSize="small" />
                                </Link>
                            )}
                        </>
                    ) : (
                        <Controller
                            control={control}
                            name="description"
                            render={({ field }) => (
                                <MarkdownEditor
                                    label="Описание"
                                    value={field.value}
                                    onChange={field.onChange}
                                    notes={notes}
                                    workspaceId={values.workspaceId}
                                />
                            )}
                        />
                    )}
                    <Stack direction="row" justifyContent="space-between" sx={{ pt: 1, pb: 3 }}>
                        <Button color="inherit" onClick={() => setConfirm(true)}>
                            {task.archived ? "Вернуть из архива" : "В архив"}
                        </Button>
                        <Button variant="contained" onClick={() => void editor.flush()}>
                            Сохранить сейчас
                        </Button>
                    </Stack>
                </Stack>
            </Drawer>
            <Dialog open={confirm} onClose={() => setConfirm(false)}>
                <DialogTitle>{task.archived ? "Вернуть задачу?" : "Убрать задачу в архив?"}</DialogTitle>
                <DialogContent>Заметки сохранятся. Задачу можно будет найти в архиве и вернуть на доску.</DialogContent>
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
