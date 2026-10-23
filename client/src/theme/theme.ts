import { createTheme } from "@mui/material/styles";
const theme = (mode: "light" | "dark") =>
    createTheme({
        palette: {
            mode,
            primary: {
                main: mode === "dark" ? "#ff69a9" : "#e50069",
                light: mode === "dark" ? "#34212d" : "#fff0f6",
                dark: "#ba0055"
            },
            secondary: { main: "#FAC710" },
            background: {
                default: mode === "dark" ? "#15171d" : "#f7f8fa",
                paper: mode === "dark" ? "#1d2028" : "#ffffff"
            },
            text: {
                primary: mode === "dark" ? "#eceef4" : "#202737",
                secondary: mode === "dark" ? "#a5adbd" : "#657084"
            },
            divider: mode === "dark" ? "#343945" : "#e8ebf0",
            success: { main: mode === "dark" ? "#72c9a8" : "#278363", light: mode === "dark" ? "#19352c" : "#edf8f3" },
            warning: { main: mode === "dark" ? "#e8b86a" : "#a66b16", light: mode === "dark" ? "#382e20" : "#fff6e7" },
            error: { main: mode === "dark" ? "#ff9595" : "#c84040", light: mode === "dark" ? "#3c2528" : "#fff0f0" }
        },
        typography: {
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            h4: { fontSize: "1.9rem", fontWeight: 750, letterSpacing: "-0.06rem" },
            h5: { fontSize: "1.3rem", fontWeight: 700 },
            h6: { fontSize: "1rem", fontWeight: 700 },
            button: { textTransform: "none", fontWeight: 600 },
            body2: { fontSize: "0.84rem" }
        },
        shape: { borderRadius: 8 },
        components: {
            MuiButton: {
                defaultProps: { disableElevation: true },
                styleOverrides: { root: { borderRadius: 9, padding: "9px 16px" } }
            },
            MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
            MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 9 } } },
            MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
            MuiDialog: { defaultProps: { fullWidth: true, maxWidth: "sm" } },
            MuiChip: { styleOverrides: { root: { borderRadius: 6, fontWeight: 500, height: 24 } } }
        }
    });
export default theme;
