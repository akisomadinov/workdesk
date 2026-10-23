import { Divider, IconButton, Menu, MenuItem } from "@mui/material";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import type { TaskItem } from "@/common/models";
import type useContextMenu from "@/hooks/useContextMenu";
import { localDate } from "@/common/models";
interface Props {
    task: TaskItem;
    menu: ReturnType<typeof useContextMenu>;
    today: string;
    busy: boolean;
    onOpen: () => void;
    onChange: (change: Partial<TaskItem>) => void;
    onDelete: () => void;
}
export default function TodayTaskMenu({ task, menu, today, busy, onOpen, onChange, onDelete }: Props) {
    const editable = task.canEdit !== false;
    function moveDay(offset: number) {
        const day = new Date(`${today}T12:00:00`);
        day.setDate(day.getDate() + offset);
        onChange({ plannedFor: localDate(day) });
        menu.close();
    }
    return (
        <>
            <IconButton
                aria-label={`Действия: ${task.title}`}
                onClick={menu.openButton}
                aria-haspopup="menu"
                aria-expanded={menu.open}
                disabled={busy}
            >
                <MoreHorizRounded fontSize="small" />
            </IconButton>
            <Menu {...menu.menuProps}>
                <MenuItem
                    onClick={() => {
                        menu.close();
                        onOpen();
                    }}
                >
                    Открыть задачу
                </MenuItem>
                {editable && task.stage !== "done" && <MenuItem onClick={() => moveDay(0)}>На сегодня</MenuItem>}
                {editable && task.stage !== "done" && <MenuItem onClick={() => moveDay(1)}>На завтра</MenuItem>}
                {editable && task.plannedFor && (
                    <MenuItem
                        onClick={() => {
                            menu.close();
                            onChange({ plannedFor: null });
                        }}
                    >
                        Убрать дату плана
                    </MenuItem>
                )}
                {editable && <Divider />}
                {editable && (
                    <MenuItem
                        sx={{ color: "error.main" }}
                        onClick={() => {
                            menu.close();
                            onDelete();
                        }}
                    >
                        Удалить
                    </MenuItem>
                )}
            </Menu>
        </>
    );
}
