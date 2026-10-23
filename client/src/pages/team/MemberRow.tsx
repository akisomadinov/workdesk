import { memo, useRef } from "react";
import {
    Avatar,
    Box,
    Button,
    Divider,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Stack,
    Typography
} from "@mui/material";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import PersonRemoveOutlined from "@mui/icons-material/PersonRemoveOutlined";
import type { PersonResponse } from "@/api/autogen/workdesk";
import useContextMenu from "@/hooks/useContextMenu";
import { editableRoles, roleLabel } from "./roles";
interface Props {
    person: PersonResponse;
    self: boolean;
    canManage: boolean;
    busy: boolean;
    onChange: (role: string) => Promise<void>;
    onRemove: () => void;
}
export default memo(function MemberRow({ person, self, canManage, busy, onChange, onRemove }: Props) {
    const menu = useContextMenu();
    const trigger = useRef<HTMLButtonElement>(null);
    return (
        <Stack
            component="li"
            direction="row"
            gap={1.25}
            alignItems="center"
            onContextMenu={canManage && !busy ? menu.triggerProps.onContextMenu : undefined}
            onKeyDown={canManage && !busy ? menu.triggerProps.onKeyDown : undefined}
            sx={{ py: 2, borderBottom: 1, borderColor: "divider", "&:last-child": { borderBottom: 0 } }}
        >
            <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: "action.selected", color: "text.secondary" }}>
                {person.name?.slice(0, 1)}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: "anywhere" }}>
                    {person.name}
                </Typography>
                {self && (
                    <Typography variant="caption" color="text.secondary">
                        Это ты
                    </Typography>
                )}
            </Box>
            {canManage ? (
                <>
                    <Button
                        ref={trigger}
                        color="inherit"
                        size="small"
                        disabled={busy}
                        onClick={menu.openButton}
                        aria-haspopup="menu"
                        aria-expanded={menu.open}
                        aria-label={`Права участника ${person.name}: ${roleLabel(person.role)}`}
                        endIcon={<ExpandMoreRounded />}
                        sx={{ flexShrink: 0, px: 1, py: 1, fontSize: 12 }}
                    >
                        {roleLabel(person.role)}
                    </Button>
                    <Menu
                        {...menu.menuProps}
                        slotProps={{ paper: { sx: { width: 320, maxWidth: "calc(100vw - 32px)" } } }}
                    >
                        {editableRoles.map((role) => (
                            <MenuItem
                                key={role.value}
                                selected={person.role === role.value}
                                disabled={busy}
                                onClick={async () => {
                                    menu.close();
                                    if (person.role !== role.value) {
                                        await onChange(role.value);
                                        requestAnimationFrame(() => trigger.current?.focus());
                                    }
                                }}
                            >
                                <ListItemIcon>
                                    {person.role === role.value && <CheckRounded fontSize="small" color="primary" />}
                                </ListItemIcon>
                                <ListItemText
                                    primary={role.label}
                                    secondary={role.description}
                                    primaryTypographyProps={{ fontSize: 14 }}
                                    secondaryTypographyProps={{ sx: { whiteSpace: "normal" }, fontSize: 12 }}
                                />
                            </MenuItem>
                        ))}
                        <Divider />
                        <MenuItem
                            sx={{ color: "error.main" }}
                            disabled={busy}
                            onClick={() => {
                                menu.close();
                                onRemove();
                            }}
                        >
                            <ListItemIcon>
                                <PersonRemoveOutlined fontSize="small" color="error" />
                            </ListItemIcon>
                            Удалить из команды
                        </MenuItem>
                    </Menu>
                </>
            ) : (
                <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                    {roleLabel(person.role)}
                </Typography>
            )}
        </Stack>
    );
});
