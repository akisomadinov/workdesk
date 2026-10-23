import { Marked, marked } from "marked";
import { Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import type { NoteLink } from "../markdown";

// Keep Obsidian links as atomic inline nodes: ordinary text serialization escapes their brackets.
const WikiLink = Node.create<{ notes: NoteLink[]; workspaceId?: string | null }>({
    name: "wikiLink",
    group: "inline",
    inline: true,
    atom: true,
    addOptions() {
        return { notes: [] };
    },
    addAttributes() {
        return { target: { default: "" }, alias: { default: "" } };
    },
    parseHTML() {
        return [{ tag: "span[data-wiki-link]" }];
    },
    renderHTML({ node }) {
        const target = String(node.attrs.target);
        const candidates = this.options.notes.filter((note) =>
            target.startsWith("note:")
                ? note.id === target.slice(5)
                : note.title.toLocaleLowerCase() === target.trim().toLocaleLowerCase()
        );
        const local = candidates.filter((note) => (note.workspaceId ?? null) === (this.options.workspaceId ?? null));
        const found = local.length === 1 ? local[0] : candidates.length === 1 ? candidates[0] : undefined;
        return [
            "span",
            { "data-wiki-link": target, class: "wiki-link", title: "Ссылка на документ" },
            String(node.attrs.alias || found?.title || target)
        ];
    },
    markdownTokenizer: {
        name: "wikiLink",
        level: "inline",
        start: "[[",
        tokenize(src) {
            const match = /^\[\[([^\]\n|]+)(?:\|([^\]\n]*))?\]\]/.exec(src);
            return match ? { type: "wikiLink", raw: match[0], target: match[1], alias: match[2] ?? "" } : undefined;
        }
    },
    parseMarkdown: (token) => ({ type: "wikiLink", attrs: { target: token.target, alias: token.alias } }),
    renderMarkdown: (node) => `[[${node.attrs?.target}${node.attrs?.alias ? `|${node.attrs.alias}` : ""}]]`
});
// Images remain portable Markdown without silently requesting external resources.
const ImageReference = Node.create({
    name: "image",
    group: "inline",
    inline: true,
    atom: true,
    addAttributes() {
        return { src: { default: "" }, alt: { default: "" }, title: { default: null } };
    },
    parseHTML() {
        return [
            {
                tag: "img[src]",
                getAttrs: (element) => ({
                    src: element.getAttribute("src"),
                    alt: element.getAttribute("alt"),
                    title: element.getAttribute("title")
                })
            }
        ];
    },
    renderHTML({ node }) {
        return ["span", { class: "image-reference" }, `Изображение: ${node.attrs.alt || "без подписи"}`];
    },
    parseMarkdown: (token) => ({ type: "image", attrs: { src: token.href, alt: token.text, title: token.title } }),
    renderMarkdown: (node) =>
        `![${String(node.attrs?.alt ?? "").replace(/[\[\]\\]/g, "\\$&")}](${String(node.attrs?.src ?? "").replace(/[()\s]/g, (char) => encodeURIComponent(char))}${node.attrs?.title ? ` "${String(node.attrs.title).replace(/"/g, '\\"')}"` : ""})`
});
export function editorExtensions(notes: NoteLink[] = [], workspaceId?: string | null) {
    return [
        StarterKit.configure({
            underline: false,
            link: {
                openOnClick: false,
                protocols: ["http", "https", "mailto"],
                HTMLAttributes: { rel: "noopener noreferrer", target: null }
            }
        }),
        // Isolate custom tokenizers between simultaneously mounted editors.
        Markdown.configure({ marked: new Marked() as unknown as typeof marked }),
        TaskList,
        TaskItem.configure({ nested: true, a11y: { checkboxLabel: (node) => node.textContent || "Пункт чек-листа" } }),
        TableKit,
        WikiLink.configure({ notes, workspaceId }),
        ImageReference,
        Placeholder.configure({ placeholder: "Начни писать или нажми / для выбора блока…" })
    ];
}
