import { useEffect, useState } from "react";
import {
    Button,
    Dialog,
    DialogContent,
    List,
    ListItemButton,
    ListItemText,
    TextField,
    Typography
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useNotes } from "@/hooks/useNotebook";
import useTasks from "@/hooks/useTasks";
export default function QuickSearch() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const { notes } = useNotes();
    const { tasks } = useTasks();
    const navigate = useNavigate();
    useEffect(() => {
        const key = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
                event.preventDefault();
                setOpen((value) => !value);
            }
        };
        window.addEventListener("keydown", key);
        return () => window.removeEventListener("keydown", key);
    }, []);
    const text = query.toLocaleLowerCase();
    const results = [
        ...notes
            .filter((note) => !note.archived)
            .map((note) => ({
                id: note.id,
                title: note.title,
                content: note.body,
                url: `/notes/${note.id}`,
                type: "Документ"
            })),
        ...tasks
            .filter((task) => !task.archived)
            .map((task) => ({
                id: task.id,
                title: task.title,
                content: task.notes,
                url: `/board?task=${task.id}`,
                type: "Задача"
            }))
    ]
        .filter((item) => `${item.title} ${item.content}`.toLocaleLowerCase().includes(text))
        .slice(0, 15);
    return (
        <>
            <Button size="small" color="inherit" onClick={() => setOpen(true)}>
                Поиск · ⌘/Ctrl K
            </Button>
            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogContent>
                    <TextField
                        autoFocus
                        label="Найти задачу или документ"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                    />
                    <List>
                        {results.map((item) => (
                            <ListItemButton
                                key={item.id}
                                onClick={() => {
                                    setOpen(false);
                                    navigate(item.url);
                                }}
                            >
                                <ListItemText primary={item.title} secondary={item.type} />
                            </ListItemButton>
                        ))}
                    </List>
                    {!results.length && <Typography color="text.secondary">Ничего не найдено.</Typography>}
                </DialogContent>
            </Dialog>
        </>
    );
}
