import { create } from "zustand";
interface UiState {
    query: string;
    source: string;
    selected: string | null;
    setQuery: (value: string) => void;
    setSource: (value: string) => void;
    select: (value: string | null) => void;
}
export const useUiStore = create<UiState>((set) => ({
    query: "",
    source: "all",
    selected: null,
    setQuery: (query) => set({ query }),
    setSource: (source) => set({ source }),
    select: (selected) => set({ selected })
}));
