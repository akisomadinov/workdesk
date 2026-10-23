import { useState } from "react";
import { Divider, IconButton, Menu, MenuItem } from "@mui/material";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import type { TaskItem } from "@/common/models";
import { localDate } from "@/common/models";
interface Props {
    task: TaskItem;
    today: string;
    busy: boolean;
    onOpen: () => void;
    onChange: (change: Partial<TaskItem>) => void;
    onDelete: () => void;
}
export default function TodayTaskMenu({ task, today, busy, onOpen, onChange, onDelete }: Props) {
    const [menu, setMenu] = useState<HTMLElement | null>(null);
    function moveDay(offset: number) {
        const day = new Date(`${today}T12:00:00`);
        day.setDate(day.getDate() + offset);
        onChange({ plannedFor: localDate(day) });
        setMenu(null);
    }
    return (
        <>
            <IconButton
                aria-label={`Действия: ${task.title}`}
                onClick={(event) => setMenu(event.currentTarget)}
                disabled={busy}
            >
                <MoreHorizRounded fontSize="small" />
            </IconButton>
            <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
                <MenuItem
                    onClick={() => {
                        setMenu(null);
                        onOpen();
                    }}
                >
                    Открыть задачу
                </MenuItem>
                {task.stage !== "done" && <MenuItem onClick={() => moveDay(0)}>На сегодня</MenuItem>}
                {task.stage !== "done" && <MenuItem onClick={() => moveDay(1)}>На завтра</MenuItem>}
                {task.plannedFor && (
                    <MenuItem
                        onClick={() => {
                            setMenu(null);
                            onChange({ plannedFor: null });
                        }}
                    >
                        Убрать дату плана
                    </MenuItem>
                )}
                <Divider />
                <MenuItem
                    sx={{ color: "error.main" }}
                    onClick={() => {
                        setMenu(null);
                        onDelete();
                    }}
                >
                    Удалить
                </MenuItem>
            </Menu>
        </>
    );
}
