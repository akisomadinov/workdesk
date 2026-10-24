import { test } from "node:test";
import assert from "node:assert/strict";
import { safeReturnTo, accountPath } from "../src/pages/account/navigation.ts";
import { registrationSchema, loginSchema } from "../src/pages/account/validation.ts";
import { JSDOM } from "jsdom";
import { accountDraftKey, readAccountDraft } from "../src/common/accountDrafts.ts";

test("authentication redirects keep internal destinations and reject external URLs", () => {
    for (const unsafe of [
        null,
        "https://example.test",
        "//example.test",
        "/\\example.test",
        "/login",
        "/register?returnTo=/login",
        "/\n/evil"
    ])
        assert.equal(safeReturnTo(unsafe), "/");
    assert.equal(safeReturnTo("/notes/document?edit=1"), "/notes/document?edit=1");
    const invitation = "/join#" + "a".repeat(64);
    const route = accountPath("register", invitation);
    assert.equal(new URLSearchParams(route.split("?")[1]).get("returnTo"), invitation);
});
test("registration validates identity and password confirmation without restricting existing login", () => {
    const values = {
        name: " Reader ",
        login: " READER ",
        email: "reader@example.test",
        password: "long-passphrase-123",
        confirmation: "long-passphrase-123"
    };
    const parsed = registrationSchema.parse(values);
    assert.equal(parsed.name, "Reader");
    assert.equal(parsed.login, "reader");
    for (const change of [
        { name: " " },
        { login: "bad@login" },
        { email: "invalid" },
        { password: "short" },
        { confirmation: "different" }
    ])
        assert.equal(registrationSchema.safeParse({ ...values, ...change }).success, false);
    assert.equal(
        loginSchema.safeParse({ ...values, name: "", login: "", email: "reader", password: "legacy", confirmation: "" })
            .success,
        true
    );
});
test("legacy drafts stay with the first owner and shared document drafts remain personal", () => {
    const storage = new JSDOM("", { url: "https://workdesk.test" }).window.localStorage;
    const owner = "00000000-0000-4000-8000-000000000001";
    const key = "workdesk-note-draft-shared";
    storage.setItem(key, "original draft");
    assert.equal(readAccountDraft(storage, key, "another-user"), null);
    assert.equal(readAccountDraft(storage, key, owner), "original draft");
    assert.equal(storage.getItem(key), null);
    storage.setItem(accountDraftKey(key, "another-user"), "another draft");
    assert.equal(readAccountDraft(storage, key, "another-user"), "another draft");
    assert.equal(readAccountDraft(storage, key, owner), "original draft");
});
