import type { Editor } from "@tiptap/core";
export const blocks = [
    {
        id: "paragraph",
        label: "Обычный текст",
        hint: "text",
        run: (editor: Editor) => editor.chain().focus().setParagraph().run()
    },
    {
        id: "heading1",
        label: "Заголовок 1",
        hint: "h1",
        run: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 1 }).run()
    },
    {
        id: "heading2",
        label: "Заголовок 2",
        hint: "h2",
        run: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 2 }).run()
    },
    {
        id: "heading3",
        label: "Заголовок 3",
        hint: "h3",
        run: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 3 }).run()
    },
    {
        id: "bulletList",
        label: "Маркированный список",
        hint: "list",
        run: (editor: Editor) => editor.chain().focus().toggleBulletList().run()
    },
    {
        id: "orderedList",
        label: "Нумерованный список",
        hint: "ordered",
        run: (editor: Editor) => editor.chain().focus().toggleOrderedList().run()
    },
    {
        id: "taskList",
        label: "Чек-лист",
        hint: "todo",
        run: (editor: Editor) => editor.chain().focus().toggleTaskList().run()
    },
    {
        id: "blockquote",
        label: "Цитата",
        hint: "quote",
        run: (editor: Editor) => editor.chain().focus().toggleBlockquote().run()
    },
    {
        id: "codeBlock",
        label: "Блок кода",
        hint: "code",
        run: (editor: Editor) => editor.chain().focus().toggleCodeBlock().run()
    },
    {
        id: "table",
        label: "Таблица",
        hint: "table",
        run: (editor: Editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    },
    {
        id: "horizontalRule",
        label: "Разделитель",
        hint: "divider",
        run: (editor: Editor) => editor.chain().focus().setHorizontalRule().run()
    }
];
