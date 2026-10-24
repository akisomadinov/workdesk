const localOwnerId = "00000000-0000-4000-8000-000000000001";

export function accountDraftKey(materialKey: string, userId: string | null): string {
    return `${materialKey}:${userId ?? "signed-out"}`;
}

export function readAccountDraft(storage: Storage, materialKey: string, userId: string | null): string | null {
    const key = accountDraftKey(materialKey, userId);
    const current = storage.getItem(key);
    if (current !== null || userId !== localOwnerId) return current;
    const legacy = storage.getItem(materialKey);
    if (legacy !== null) {
        storage.setItem(key, legacy);
        storage.removeItem(materialKey);
    }
    return legacy;
}
