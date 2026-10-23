import { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { setupListeners } from "@reduxjs/toolkit/query";
import { store } from "@/app/store";
import theme from "@/theme/theme";
import App from "./App";
import "@/api/configure";
import { usePreferences } from "@/stores/usePreferences";
function ThemedApp() {
    const preferred = usePreferences((state) => state.theme);
    const dark = useMediaQuery("(prefers-color-scheme: dark)");
    const selected = useMemo(
        () => theme(preferred === "system" ? (dark ? "dark" : "light") : preferred),
        [preferred, dark]
    );
    return (
        <ThemeProvider theme={selected}>
            <CssBaseline />
            <BrowserRouter basename="/">
                <App />
            </BrowserRouter>
        </ThemeProvider>
    );
}
setupListeners(store.dispatch);
createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <Provider store={store}>
            <ThemedApp />
        </Provider>
    </StrictMode>
);
