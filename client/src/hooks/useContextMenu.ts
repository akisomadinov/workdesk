import { useEffect, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import type { MenuProps } from "@mui/material";
export default function useContextMenu(itemId?: string) {
    const [anchor, setAnchor] = useState<{ element: HTMLElement; position?: { top: number; left: number } } | null>(
        null
    );
    useEffect(() => setAnchor(null), [itemId]);
    const close = () => setAnchor(null);
    function nativeMenu(target: EventTarget, container: HTMLElement) {
        if (!(target instanceof Element)) return false;
        if (!container.contains(target)) return true;
        if (target.closest('input, textarea, [contenteditable="true"], [data-native-context-menu]')) return true;
        const selection = window.getSelection();
        return (
            !!selection && !selection.isCollapsed && !!selection.anchorNode && container.contains(selection.anchorNode)
        );
    }
    function focus(container: HTMLElement, target: EventTarget) {
        const element = target instanceof Element ? target.closest<HTMLElement>("button, a, [tabindex]") : null;
        const trigger =
            element && container.contains(element)
                ? element
                : container.querySelector<HTMLElement>("button, a, [tabindex]");
        trigger?.focus({ preventScroll: true });
    }
    const menuProps: MenuProps = {
        open: !!anchor,
        anchorEl: anchor?.position ? undefined : anchor?.element,
        anchorReference: anchor?.position ? "anchorPosition" : "anchorEl",
        anchorPosition: anchor?.position,
        onClose: close
    };
    return {
        open: !!anchor,
        close,
        menuProps,
        openButton: (event: MouseEvent<HTMLElement>) => {
            event.stopPropagation();
            setAnchor({ element: event.currentTarget });
        },
        triggerProps: {
            "aria-haspopup": "menu" as const,
            "aria-expanded": !!anchor,
            onContextMenu: (event: MouseEvent<HTMLElement>) => {
                if (nativeMenu(event.target, event.currentTarget)) return;
                event.preventDefault();
                event.stopPropagation();
                focus(event.currentTarget, event.target);
                setAnchor({ element: event.currentTarget, position: { left: event.clientX, top: event.clientY } });
            },
            onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
                if (
                    (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) ||
                    nativeMenu(event.target, event.currentTarget)
                )
                    return;
                event.preventDefault();
                event.stopPropagation();
                const rect = (
                    event.target instanceof HTMLElement ? event.target : event.currentTarget
                ).getBoundingClientRect();
                setAnchor({ element: event.currentTarget, position: { left: rect.left + 8, top: rect.bottom } });
            }
        }
    };
}
