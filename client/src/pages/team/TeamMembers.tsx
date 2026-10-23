import { useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Typography
} from "@mui/material";
import { useTeamRoleMutation } from "@/api/autogen/workdesk";
import type { PersonResponse, WorkspaceResponse } from "@/api/autogen/workdesk";
import { message } from "@/common/models";
import MemberRow from "./MemberRow";
export default function TeamMembers({ space, userId }: { space: WorkspaceResponse; userId?: string }) {
    const [changeRole, { isLoading }] = useTeamRoleMutation();
    const [remove, setRemove] = useState<PersonResponse | null>(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const heading = useRef<HTMLHeadingElement>(null);
    async function update(person: PersonResponse, role: string) {
        setError("");
        setNotice("");
        try {
            await changeRole({ id: space.id ?? "", user: person.id ?? "", roleRequest: { role } }).unwrap();
            setRemove(null);
            setNotice(role === "removed" ? "Участник удалён из команды" : "Права обновлены");
            if (role === "removed") requestAnimationFrame(() => heading.current?.focus());
        } catch (failure) {
            setError(message(failure));
        }
    }
    return (
        <Box>
            <Typography ref={heading} tabIndex={-1} variant="body2" component="h2" fontWeight={650} sx={{ mb: 0.5 }}>
                Участники · {space.members?.length ?? 0}
            </Typography>
            {error && !remove && (
                <Alert severity="error" onClose={() => setError("")} sx={{ my: 1 }}>
                    {error}
                </Alert>
            )}
            <Typography variant="caption" color="text.secondary" role="status">
                {notice ||
                    (space.role === "owner"
                        ? "Нажми на роль, чтобы изменить права."
                        : "Участниками управляет владелец команды.")}
            </Typography>
            <Box component="ul" sx={{ p: 0, m: 0, mt: 1 }}>
                {(space.members ?? []).map((person) => (
                    <MemberRow
                        key={person.id}
                        person={person}
                        self={person.id === userId}
                        canManage={space.role === "owner" && person.role !== "owner"}
                        busy={isLoading}
                        onChange={(role) => update(person, role)}
                        onRemove={() => {
                            setError("");
                            setRemove(person);
                        }}
                    />
                ))}
            </Box>
            <Dialog
                open={!!remove}
                onClose={isLoading ? undefined : () => setRemove(null)}
                aria-labelledby="remove-member-title"
            >
                <DialogTitle id="remove-member-title">Удалить участника?</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ overflowWrap: "anywhere" }}>
                        {remove?.name} потеряет доступ к команде «{space.name}». Личные материалы сохранятся.
                    </DialogContentText>
                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button color="inherit" autoFocus disabled={isLoading} onClick={() => setRemove(null)}>
                        Отмена
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        disabled={isLoading}
                        onClick={() => remove && void update(remove, "removed")}
                    >
                        Удалить
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
