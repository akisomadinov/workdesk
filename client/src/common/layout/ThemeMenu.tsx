import { useState } from "react";
import type { ReactNode } from "react";
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip, useTheme } from "@mui/material";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import BrightnessAutoOutlined from "@mui/icons-material/BrightnessAutoOutlined";
import CheckRounded from "@mui/icons-material/CheckRounded";
import { usePreferences } from "@/stores/usePreferences";
import type { ThemeMode } from "@/stores/usePreferences";

const choices = [
    { value: "light", label: "Светлая", icon: <LightModeOutlined fontSize="small" /> },
    { value: "dark", label: "Тёмная", icon: <DarkModeOutlined fontSize="small" /> },
    { value: "system", label: "Как в системе", icon: <BrightnessAutoOutlined fontSize="small" /> }
] satisfies { value: ThemeMode; label: string; icon: ReactNode }[];

export default function ThemeMenu() {
    const { theme, setTheme } = usePreferences();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const current = choices.find((choice) => choice.value === theme) ?? choices[2];
    const dark = useTheme().palette.mode === "dark";
    return (
        <>
            <Tooltip title={`Тема: ${current.label}`}>
                <IconButton
                    aria-label="Выбрать тему"
                    aria-haspopup="menu"
                    aria-expanded={!!anchor}
                    onClick={(event) => setAnchor(event.currentTarget)}
                    sx={{ width: 40, height: 40 }}
                >
                    {dark ? <DarkModeOutlined fontSize="small" /> : <LightModeOutlined fontSize="small" />}
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={anchor}
                open={!!anchor}
                onClose={() => setAnchor(null)}
                slotProps={{ list: { "aria-label": "Тема оформления" }, paper: { sx: { minWidth: 190 } } }}
            >
                {choices.map((choice) => (
                    <MenuItem
                        key={choice.value}
                        selected={theme === choice.value}
                        role="menuitemradio"
                        aria-checked={theme === choice.value}
                        onClick={() => {
                            setTheme(choice.value);
                            setAnchor(null);
                        }}
                    >
                        <ListItemIcon>{choice.icon}</ListItemIcon>
                        <ListItemText>{choice.label}</ListItemText>
                        {theme === choice.value && <CheckRounded fontSize="small" sx={{ ml: 2 }} />}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}
