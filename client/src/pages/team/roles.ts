export const editableRoles = [
    { value: "reader", label: "Читатель", description: "Просматривает задачи и документы" },
    { value: "editor", label: "Редактор", description: "Создаёт, изменяет и удаляет материалы" }
] as const;
export type EditableRole = (typeof editableRoles)[number]["value"];
export function roleLabel(role?: string | null) {
    return role === "owner" ? "Владелец" : (editableRoles.find((item) => item.value === role)?.label ?? "Читатель");
}
