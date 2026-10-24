import { useState } from "react";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import { useFormContext } from "react-hook-form";
import type { AccountValues } from "./validation";

export default function PasswordField({
    creating,
    confirmation = false
}: {
    creating: boolean;
    confirmation?: boolean;
}) {
    const [visible, setVisible] = useState(false);
    const {
        register,
        formState: { errors }
    } = useFormContext<AccountValues>();
    const name = confirmation ? "confirmation" : "password";
    return (
        <TextField
            label={confirmation ? "Повтори пароль" : "Пароль"}
            type={visible ? "text" : "password"}
            {...register(name)}
            autoComplete={creating ? "new-password" : "current-password"}
            error={!!errors[name]}
            helperText={
                errors[name]?.message ??
                (creating && !confirmation ? "Не меньше 12 символов. Можно использовать фразу." : undefined)
            }
            slotProps={{
                input: {
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton
                                aria-label={`${visible ? "Скрыть" : "Показать"} ${confirmation ? "повтор пароля" : "пароль"}`}
                                aria-pressed={visible}
                                onClick={() => setVisible(!visible)}
                                edge="end"
                            >
                                {visible ? (
                                    <VisibilityOffOutlined fontSize="small" />
                                ) : (
                                    <VisibilityOutlined fontSize="small" />
                                )}
                            </IconButton>
                        </InputAdornment>
                    )
                }
            }}
        />
    );
}
