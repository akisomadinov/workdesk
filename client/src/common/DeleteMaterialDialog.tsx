import { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { useNotesDeleteMutation, useTasksDeleteMutation } from "@/api/autogen/workdesk";
import { message } from "./models";
interface Props {
    kind: "task" | "note";
    item: { id: string; title: string; revision: number; connectionId?: string | null };
    prepare?: () => Promise<boolean>;
    getRevision?: () => number;
    onClose: () => void;
    onDeleted: () => void;
}
export default function DeleteMaterialDialog({ kind, item, prepare, getRevision, onClose, onDeleted }: Props) {
    const [deleteTask] = useTasksDeleteMutation();
    const [deleteNote] = useNotesDeleteMutation();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    async function remove() {
        setBusy(true);
        setError("");
        try {
            if (prepare && !(await prepare())) {
                setError("Сначала сохрани изменения. Закрой это окно и проверь ошибки в редакторе.");
                return;
            }
            const request = { id: item.id, revision: getRevision?.() ?? item.revision };
            await (kind === "task" ? deleteTask(request) : deleteNote(request)).unwrap();
            onDeleted();
        } catch (failure) {
            setError(message(failure));
        } finally {
            setBusy(false);
        }
    }
    return (
        <Dialog
            open
            onClose={busy ? undefined : onClose}
            fullWidth
            maxWidth="xs"
            aria-labelledby="delete-material-title"
        >
            <DialogTitle id="delete-material-title">
                {kind === "task" ? "Удалить задачу?" : "Удалить документ?"}
            </DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ overflowWrap: "anywhere" }}>
                    «{item.title}» попадёт в корзину. Оттуда можно восстановить содержимое.
                </DialogContentText>
                {kind === "task" && item.connectionId && (
                    <DialogContentText sx={{ mt: 1.5 }}>
                        В GitLab или GitHub задача останется. Синхронизация не вернёт её на доску.
                    </DialogContentText>
                )}
                {kind === "note" && (
                    <DialogContentText sx={{ mt: 1.5 }}>
                        Вложенные документы останутся в библиотеке на верхнем уровне.
                    </DialogContentText>
                )}
                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button color="inherit" disabled={busy} onClick={onClose} autoFocus>
                    Отмена
                </Button>
                <Button color="error" variant="contained" disabled={busy} onClick={() => void remove()}>
                    {busy ? "Удаляем…" : "Удалить"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
