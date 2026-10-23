import { test } from "node:test";
import assert from "node:assert/strict";
import { act, createElement } from "react";
import { JSDOM } from "jsdom";
import useContextMenu from "../src/hooks/useContextMenu.ts";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://workdesk.test" });
Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true
});
const { createRoot } = await import("react-dom/client");
function mount() {
    let state: ReturnType<typeof useContextMenu>;
    function Harness({ id = "first" }: { id?: string }) {
        const menu = useContextMenu(id);
        state = menu;
        return createElement(
            "div",
            { ...menu.triggerProps, id: "row" },
            createElement("button", { id: "trigger", onClick: menu.openButton }, "Document"),
            createElement("input", { id: "input" }),
            createElement(
                "div",
                { contentEditable: true, suppressContentEditableWarning: true, id: "editor" },
                "Editable"
            ),
            createElement("span", { id: "text" }, "Selectable text")
        );
    }
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    act(() => root.render(createElement(Harness)));
    function send(selector: string, event: Event) {
        let allowed = false;
        act(() => {
            allowed = container.querySelector(selector)!.dispatchEvent(event);
        });
        return allowed;
    }
    return {
        send,
        container,
        state: () => state!,
        changeItem: (id: string) => act(() => root.render(createElement(Harness, { id }))),
        close: () => act(() => state!.close()),
        dispose: () => {
            act(() => root.unmount());
            container.remove();
        }
    };
}
function rightClick() {
    return new dom.window.MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 190, clientY: 280 });
}
test("right-click opens at the pointer and the visible button opens the same menu", () => {
    const h = mount();
    try {
        assert.equal(h.send("#trigger", rightClick()), false);
        assert.equal(h.state().open, true);
        assert.deepEqual(h.state().menuProps.anchorPosition, { left: 190, top: 280 });
        assert.equal(document.activeElement?.id, "trigger");
        h.close();
        h.send("#trigger", new dom.window.MouseEvent("click", { bubbles: true }));
        assert.equal(h.state().menuProps.anchorReference, "anchorEl");
        assert.equal(h.state().menuProps.anchorEl, h.container.querySelector("#trigger"));
    } finally {
        h.dispose();
    }
});
test("keyboard context keys open actions without activating the document", () => {
    const h = mount();
    try {
        for (const key of ["F10", "ContextMenu"]) {
            assert.equal(
                h.send(
                    "#trigger",
                    new dom.window.KeyboardEvent("keydown", {
                        key,
                        shiftKey: key === "F10",
                        bubbles: true,
                        cancelable: true
                    })
                ),
                false
            );
            assert.equal(h.state().open, true);
            h.close();
        }
        h.send("#trigger", new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        assert.equal(h.state().open, false);
    } finally {
        h.dispose();
    }
});
test("text inputs, the editor and selected text keep the native context menu", () => {
    const h = mount();
    try {
        for (const selector of ["#input", "#editor"]) {
            assert.equal(h.send(selector, rightClick()), true);
            assert.equal(h.state().open, false);
            assert.equal(
                h.send(
                    selector,
                    new dom.window.KeyboardEvent("keydown", {
                        key: "F10",
                        shiftKey: true,
                        bubbles: true,
                        cancelable: true
                    })
                ),
                true
            );
        }
        const range = document.createRange();
        range.selectNodeContents(h.container.querySelector("#text")!);
        window.getSelection()!.removeAllRanges();
        window.getSelection()!.addRange(range);
        assert.equal(h.send("#text", rightClick()), true);
        assert.equal(h.state().open, false);
    } finally {
        window.getSelection()!.removeAllRanges();
        h.dispose();
    }
});

test("changing the suggested first task closes its old context menu", () => {
    const h = mount();
    try {
        h.send("#trigger", rightClick());
        assert.equal(h.state().open, true);
        h.changeItem("second");
        assert.equal(h.state().open, false);
    } finally {
        h.dispose();
    }
});
