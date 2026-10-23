import { Box, Divider, IconButton, ListItemButton, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import { Link } from "react-router-dom";
import type { NoteItem } from "@/hooks/useNotebook";
import useContextMenu from "@/hooks/useContextMenu";
import { dateTime } from "@/common/models";
interface Props {
    note: NoteItem;
    selected?: boolean;
    recent?: boolean;
    depth?: number;
    collapsed?: boolean;
    hasChildren?: boolean;
    onToggle?: () => void;
    onRename: () => void;
    onDelete: () => void;
    onDownload: () => void;
    onCopyLink: () => void;
}
export default function NoteListItem({
    note,
    selected,
    recent,
    depth = 0,
    collapsed,
    hasChildren,
    onToggle,
    onRename,
    onDelete,
    onDownload,
    onCopyLink
}: Props) {
    const menu = useContextMenu();
    function action(callback: () => void) {
        menu.close();
        callback();
    }
    return (
        <Box
            component="li"
            onContextMenu={menu.triggerProps.onContextMenu}
            onKeyDown={menu.triggerProps.onKeyDown}
            sx={{
                display: "flex",
                alignItems: "center",
                pl: recent ? 0 : Math.min(depth, 6) * 1.5,
                mb: 0.25,
                borderBottom: recent ? 1 : 0,
                borderColor: "divider",
                borderRadius: recent ? 0 : 1,
                bgcolor: selected ? "action.selected" : undefined
            }}
        >
            {!recent && hasChildren ? (
                <IconButton
                    size="small"
                    aria-label={`${collapsed ? "Развернуть" : "Свернуть"} ${note.title}`}
                    aria-expanded={!collapsed}
                    onClick={onToggle}
                >
                    {collapsed ? (
                        <ChevronRightRounded sx={{ fontSize: 16 }} />
                    ) : (
                        <ExpandMoreRounded sx={{ fontSize: 16 }} />
                    )}
                </IconButton>
            ) : (
                <DescriptionOutlined
                    sx={{ ml: 1, mr: 0.75, fontSize: recent ? 20 : 16, flexShrink: 0, color: "text.secondary" }}
                />
            )}
            <ListItemButton
                component={Link}
                to={`/notes/${note.id}`}
                aria-current={selected ? "page" : undefined}
                aria-haspopup="menu"
                aria-expanded={menu.open}
                sx={{ minWidth: 0, borderRadius: 1, px: 1, py: recent ? 1.5 : 0.75 }}
            >
                <ListItemText
                    primary={`${note.pinned ? "• " : ""}${note.title}`}
                    secondary={recent ? dateTime(note.modified ?? note.created) : undefined}
                    primaryTypographyProps={{
                        fontSize: recent ? 14 : 13,
                        fontWeight: recent ? 600 : 400,
                        noWrap: !recent,
                        title: note.title,
                        sx: { overflowWrap: "anywhere" }
                    }}
                />
            </ListItemButton>
            <Tooltip title="Действия с документом">
                <IconButton
                    size="small"
                    aria-label={`Действия с документом: ${note.title}`}
                    aria-haspopup="menu"
                    aria-expanded={menu.open}
                    onClick={menu.openButton}
                    sx={{ flexShrink: 0, width: 36, height: 36 }}
                >
                    <MoreHorizRounded fontSize="small" />
                </IconButton>
            </Tooltip>
            <Menu {...menu.menuProps}>
                <MenuItem component={Link} to={`/notes/${note.id}`} onClick={menu.close}>
                    Открыть
                </MenuItem>
                <MenuItem
                    component={Link}
                    to={`/notes/${note.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={menu.close}
                >
                    Открыть в новой вкладке
                </MenuItem>
                {note.canEdit && <MenuItem onClick={() => action(onRename)}>Переименовать</MenuItem>}
                <MenuItem onClick={() => action(onCopyLink)}>Копировать ссылку</MenuItem>
                <MenuItem onClick={() => action(onDownload)}>Скачать Markdown</MenuItem>
                {note.canEdit && <Divider />}
                {note.canEdit && (
                    <MenuItem sx={{ color: "error.main" }} onClick={() => action(onDelete)}>
                        <DeleteOutlineRounded fontSize="small" sx={{ mr: 1 }} />
                        Удалить
                    </MenuItem>
                )}
            </Menu>
        </Box>
    );
}
