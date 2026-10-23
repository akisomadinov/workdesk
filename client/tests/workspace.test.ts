import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
const dom = new JSDOM("", { url: "https://workdesk.test" });
Object.defineProperty(globalThis, "sessionStorage", { value: dom.window.sessionStorage });
const { useWorkspaceStore } = await import("../src/stores/useWorkspaceStore.ts");

test("the selected workspace survives a reload for the same account", async () => {
    useWorkspaceStore.getState().bindUser("owner");
    useWorkspaceStore.getState().setScope("team-one");
    const saved = sessionStorage.getItem("workdesk-workspace")!;
    useWorkspaceStore.setState({ scope: "mine", userId: null });
    sessionStorage.setItem("workdesk-workspace", saved);
    await useWorkspaceStore.persist.rehydrate();
    useWorkspaceStore.getState().bindUser("owner");
    assert.equal(useWorkspaceStore.getState().scope, "team-one");
});

test("changing accounts resets the selected team before using another account", () => {
    useWorkspaceStore.getState().bindUser("owner");
    useWorkspaceStore.getState().setScope("private-team");
    useWorkspaceStore.getState().bindUser("reader");
    assert.equal(useWorkspaceStore.getState().scope, "mine");
    const saved = JSON.parse(sessionStorage.getItem("workdesk-workspace")!).state;
    assert.equal(saved.userId, "reader");
    assert.equal(saved.scope, "mine");
});
