import { useId } from "react";
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTeamCreateMutation } from "@/api/autogen/workdesk";
import useSwitchWorkspace from "@/hooks/useSwitchWorkspace";
import { message } from "@/common/models";
import { createTeamSchema } from "./validation";
export default function CreateTeamDialog({ onClose }: { onClose: () => void }) {
    const id = useId();
    const [create] = useTeamCreateMutation();
    const switchWorkspace = useSwitchWorkspace();
    const form = useForm({ resolver: zodResolver(createTeamSchema), mode: "onChange", defaultValues: { name: "" } });
    const busy = form.formState.isSubmitting;
    return (
        <Dialog
            open
            onClose={busy ? undefined : onClose}
            aria-labelledby={`${id}-title`}
            slotProps={{ paper: { sx: { mx: { xs: 2, sm: 4 }, width: "calc(100% - 32px)" } } }}
        >
            <DialogTitle id={`${id}-title`}>Создать команду</DialogTitle>
            <DialogContent>
                <form
                    id={id}
                    onSubmit={form.handleSubmit(async ({ name }) => {
                        try {
                            const created = await create({ createWorkspaceRequest: { name } }).unwrap();
                            if (created.id) switchWorkspace(created.id);
                            onClose();
                        } catch (error) {
                            form.setError("root", { message: message(error) });
                        }
                    })}
                >
                    <Stack gap={2} sx={{ pt: 1 }}>
                        <TextField
                            autoFocus
                            label="Название команды"
                            placeholder="Например, Разработка"
                            {...form.register("name")}
                            disabled={busy}
                            error={!!form.formState.errors.name}
                            helperText={form.formState.errors.name?.message}
                        />
                        <Typography variant="body2" color="text.secondary">
                            У команды будет общая доска и документы. Личные материалы останутся в твоём пространстве.
                        </Typography>
                        {form.formState.errors.root && (
                            <Alert severity="error">{form.formState.errors.root.message}</Alert>
                        )}
                    </Stack>
                </form>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button color="inherit" disabled={busy} onClick={onClose}>
                    Отмена
                </Button>
                <Button form={id} type="submit" variant="contained" disabled={busy || !form.formState.isValid}>
                    {busy ? "Создаём…" : "Создать"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
