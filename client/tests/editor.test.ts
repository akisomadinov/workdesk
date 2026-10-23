import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { Editor } from "@tiptap/core";
import { editorExtensions } from "../src/common/editor/extensions.ts";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://workdesk.test" });
Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    DOMParser: dom.window.DOMParser,
    Node: dom.window.Node,
    HTMLElement: dom.window.HTMLElement,
    getComputedStyle: dom.window.getComputedStyle
});
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
function editor(markdown: string) {
    return new Editor({
        extensions: editorExtensions([{ id: "target", title: "Решения" }]),
        content: markdown,
        contentType: "markdown"
    });
}
function roundtrip(markdown: string) {
    const first = editor(markdown);
    const serialized = first.getMarkdown();
    const next = editor(serialized);
    assert.deepEqual(next.getJSON(), first.getJSON(), serialized);
    first.destroy();
    next.destroy();
    return serialized;
}
test("formatting, nested lists, task states, code and tables survive editing and reopening", () => {
    const saved = roundtrip(
        '## План\n\n**Важно** и *курсив*, ~~готово~~, `код`.\n\n- [x] Проверено\n- [ ] Сделать\n\n1. Первый\n2. Второй\n\n> Решение\n\n```ts\nconst value = "<script>literal</script>";\n```\n\n| Название | Статус |\n| --- | --- |\n| API | Готово |\n\n---'
    );
    assert.match(saved, /\[x\] Проверено/);
    assert.match(saved, /\[ \] Сделать/);
    assert.match(saved, /\| API\s*\| Готово/);
    assert.match(saved, /const value = "<script>literal<\/script>"/);
});
test("wiki references and images remain portable without external image requests", () => {
    const saved = roundtrip(
        '[[note:target|Решения]] и [[Решения]]\n\n[Задача](/board?task=123)\n\n![Схема](https://example.test/image.png "Архитектура")'
    );
    assert.ok(saved.includes("[[note:target|Решения]]"));
    assert.ok(saved.includes("[[Решения]]"));
    assert.ok(saved.includes("[Задача](/board?task=123)"));
    assert.ok(saved.includes("![Схема](https://example.test/image.png"));
    const instance = editor(saved);
    assert.equal(
        [...instance.view.dom.getElementsByTagName("img")].filter((image) => image.hasAttribute("src")).length,
        0
    );
    instance.destroy();
});
test("unsafe Markdown links do not render executable URLs", () => {
    const instance = editor("[Нажать](javascript:alert%281%29)\n\n[Безопасная](https://example.test)");
    assert.equal(instance.view.dom.querySelector('a[href^="javascript:"]'), null);
    assert.ok(instance.view.dom.querySelector('a[href="https://example.test"]'));
    instance.destroy();
});
test("literal Markdown punctuation is stable across repeated saves", () => {
    const saved = roundtrip("Текст с \\*звёздочкой\\*, \\[скобками\\] и C:\\\\work.\n\n```md\n[[это не ссылка]]\n```");
    assert.match(saved, /\[\[это не ссылка\]\]/);
});
