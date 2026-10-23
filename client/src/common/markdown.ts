import type { Root } from "mdast";
import type { Plugin } from "unified";
export interface NoteLink {
    id: string;
    title: string;
    workspaceId?: string | null;
}
interface MdNode {
    type: string;
    value?: string;
    url?: string;
    children?: MdNode[];
}
export function wikiPlugin(notes: NoteLink[], workspace?: string | null): Plugin<[], Root> {
    return () => (tree) => {
        function walk(parent: MdNode) {
            if (!parent.children || ["link", "code", "inlineCode"].includes(parent.type)) return;
            const children: MdNode[] = [];
            for (const node of parent.children) {
                if (node.type !== "text" || !node.value) {
                    walk(node);
                    children.push(node);
                    continue;
                }
                let end = 0;
                for (const match of node.value.matchAll(/\[\[([^\]\n]+)\]\]/g)) {
                    const [target, alias] = match[1].split("|");
                    const candidates = notes.filter((note) =>
                        target.startsWith("note:")
                            ? note.id === target.slice(5)
                            : note.title.toLocaleLowerCase() === target.trim().toLocaleLowerCase()
                    );
                    const local = candidates.filter((note) => (note.workspaceId ?? null) === (workspace ?? null));
                    const found = local.length === 1 ? local[0] : candidates.length === 1 ? candidates[0] : undefined;
                    children.push({ type: "text", value: node.value.slice(end, match.index) });
                    children.push({
                        type: "link",
                        url: found ? `/notes/${found.id}` : `/notes?q=${encodeURIComponent(target)}`,
                        children: [{ type: "text", value: alias || (found?.title ?? target) }]
                    });
                    end = match.index! + match[0].length;
                }
                children.push({ type: "text", value: node.value.slice(end) });
            }
            parent.children = children;
        }
        walk(tree);
    };
}
export function linksTo(body: string, note: NoteLink) {
    const text = body.replace(/```[\s\S]*?```|`[^`]*`/g, "");
    if (text.includes(`](/notes/${note.id})`)) return true;
    return [...text.matchAll(/\[\[([^\]\n|]+)(?:\|[^\]\n]*)?\]\]/g)].some(
        (match) =>
            match[1] === `note:${note.id}` || match[1].trim().toLocaleLowerCase() === note.title.toLocaleLowerCase()
    );
}
export function noteTree<T extends NoteLink & { parentId?: string | null }>(notes: T[]) {
    const ids = new Set(notes.map((note) => note.id));
    const result: { note: T; depth: number }[] = [];
    const visited = new Set<string>();
    function visit(note: T, depth: number) {
        if (visited.has(note.id)) return;
        visited.add(note.id);
        result.push({ note, depth });
        notes.filter((child) => child.parentId === note.id).forEach((child) => visit(child, depth + 1));
    }
    notes.filter((note) => !note.parentId || !ids.has(note.parentId)).forEach((note) => visit(note, 0));
    notes.forEach((note) => visit(note, 0));
    return result;
}
export const noteTemplates = {
    blank: { label: "Пустой документ", title: "Новый документ", body: "" },
    daily: {
        label: "Ежедневник",
        title: "Ежедневник",
        body: "## Главное на сегодня\n\n- [ ] \n\n## Что сделано\n\n\n## На чём остановился\n\n\n## Завтра\n\n- [ ] \n"
    },
    meeting: {
        label: "Встреча",
        title: "Встреча",
        body: "## Участники\n\n\n## Обсудили\n\n- \n\n## Решения\n\n- \n\n## Следующие действия\n\n- [ ] \n"
    },
    investigation: {
        label: "Исследование / проблема",
        title: "Исследование",
        body: "## Проблема\n\n\n## Наблюдения\n\n- \n\n## Гипотезы\n\n- [ ] \n\n## Решение\n\n\n## Проверка\n\n- [ ] \n"
    }
};
export function downloadMarkdown(title: string, body: string) {
    const url = URL.createObjectURL(new Blob([body], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = title.replace(/[/\\:*?"<>|]/g, "_") + ".md";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
