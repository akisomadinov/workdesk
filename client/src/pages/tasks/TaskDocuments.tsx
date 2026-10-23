import { useState } from "react";
import {
    Autocomplete,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Stack,
    TextField,
    Tooltip,
    Typography
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import LinkRounded from "@mui/icons-material/LinkRounded";
import LinkOffRounded from "@mui/icons-material/LinkOffRounded";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import NewDocumentDialog from "@/common/NewDocumentDialog";
import type { NoteItem } from "@/hooks/useNotebook";
import type { TaskItem } from "@/common/models";
interface Props {
    task: TaskItem;
    notes: NoteItem[];
    ids: string[];
    mentioned: NoteItem[];
    onChange: (ids: string[]) => void;
    onOpen: (id: string) => void;
    beforeCreate: () => Promise<boolean>;
    onCreated: (id: string) => Promise<void>;
}
export default function TaskDocuments({
    task,
    notes,
    ids,
    mentioned,
    onChange,
    onOpen,
    beforeCreate,
    onCreated
}: Props) {
    const [attach, setAttach] = useState(false);
    const [create, setCreate] = useState(false);
    const [picked, setPicked] = useState<NoteItem | null>(null);
    const related = notes.filter((note) => ids.includes(note.id) || mentioned.some((item) => item.id === note.id));
    const available = notes.filter(
        (note) => !note.archived && !ids.includes(note.id) && (note.workspaceId ?? "") === (task.workspaceId ?? "")
    );
    const readOnly = task.canEdit === false;
    return (
        <Stack gap={2}>
            <Typography variant="body2" color="text.secondary">
                Решения, инструкции и материалы для этой задачи.
            </Typography>
            {!readOnly && (
                <Stack direction="row" gap={1} flexWrap="wrap">
                    <Button
                        variant="outlined"
                        color="inherit"
                        startIcon={<LinkRounded />}
                        onClick={() => setAttach(true)}
                        disabled={ids.length >= 50}
                    >
                        Прикрепить
                    </Button>
                    <Button
                        color="inherit"
                        startIcon={<AddRounded />}
                        disabled={ids.length >= 50}
                        onClick={async () => {
                            if (await beforeCreate()) setCreate(true);
                        }}
                    >
                        Создать документ
                    </Button>
                </Stack>
            )}
            {related.length ? (
                <List disablePadding>
                    {related.map((note) => (
                        <ListItem
                            key={note.id}
                            disablePadding
                            sx={{ borderBottom: 1, borderColor: "divider" }}
                            secondaryAction={
                                !readOnly && ids.includes(note.id) ? (
                                    <Tooltip title="Убрать связь с задачей">
                                        <IconButton
                                            aria-label={`Открепить: ${note.title}`}
                                            onClick={() => onChange(ids.filter((id) => id !== note.id))}
                                        >
                                            <LinkOffRounded fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                ) : undefined
                            }
                        >
                            <ListItemButton onClick={() => onOpen(note.id)} sx={{ py: 1.5, pl: 0.5 }}>
                                <ListItemIcon sx={{ minWidth: 34 }}>
                                    <DescriptionOutlined fontSize="small" />
                                </ListItemIcon>
                                <ListItemText
                                    primary={note.title}
                                    secondary={
                                        note.archived
                                            ? "В архиве"
                                            : ids.includes(note.id)
                                              ? "Прикреплён к задаче"
                                              : "Упомянут в тексте"
                                    }
                                    primaryTypographyProps={{
                                        fontSize: 14,
                                        fontWeight: 600,
                                        sx: { overflowWrap: "anywhere" }
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            ) : (
                <Box
                    sx={{
                        py: 5,
                        textAlign: "center",
                        border: 1,
                        borderStyle: "dashed",
                        borderColor: "divider",
                        borderRadius: 1.5
                    }}
                >
                    <DescriptionOutlined sx={{ color: "text.disabled", fontSize: 32, mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                        Здесь будут документы по задаче
                    </Typography>
                </Box>
            )}
            <Dialog open={attach} onClose={() => setAttach(false)}>
                <DialogTitle>Прикрепить документ</DialogTitle>
                <DialogContent>
                    <Stack gap={2} sx={{ pt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Документы из того же пространства, что и задача.
                        </Typography>
                        <Autocomplete
                            openText="Открыть список"
                            closeText="Закрыть список"
                            clearText="Очистить"
                            options={available}
                            value={picked}
                            onChange={(_, value) => setPicked(value)}
                            getOptionLabel={(note) => note.title}
                            isOptionEqualToValue={(a, b) => a.id === b.id}
                            noOptionsText="Подходящих документов нет"
                            renderInput={(params) => <TextField {...params} autoFocus label="Найти документ" />}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button color="inherit" onClick={() => setAttach(false)}>
                        Отмена
                    </Button>
                    <Button
                        variant="contained"
                        disabled={!picked}
                        onClick={() => {
                            if (picked) onChange([...ids, picked.id]);
                            setPicked(null);
                            setAttach(false);
                        }}
                    >
                        Прикрепить
                    </Button>
                </DialogActions>
            </Dialog>
            {create && <NewDocumentDialog task={task} onClose={() => setCreate(false)} onCreated={onCreated} />}
        </Stack>
    );
}
