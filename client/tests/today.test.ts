import { test } from "node:test";
import assert from "node:assert/strict";
import { buildToday, firstReason } from "../src/pages/today/today.ts";
import { normalizeTask } from "../src/common/models.ts";
import type { TaskItem } from "../src/common/models.ts";
const today = "2026-10-24";
function task(id: string, values: Partial<TaskItem> = {}) {
    return normalizeTask({ id, title: id, ...values });
}
test("first task follows priority; overdue and today tasks appear once", () => {
    const tasks = [
        task("old", { plannedFor: "2026-10-20" }),
        task("today", { plannedFor: today }),
        task("urgent", { plannedFor: today, priority: "urgent" })
    ];
    const result = buildToday(tasks, today);
    assert.equal(result.first?.id, "urgent");
    assert.deepEqual(
        result.overdue.map((item) => item.id),
        ["old"]
    );
    assert.deepEqual(
        result.planned.map((item) => item.id),
        ["today"]
    );
    assert.equal(new Set([result.first, ...result.overdue, ...result.planned].map((item) => item?.id)).size, 3);
    assert.deepEqual(
        tasks.map((item) => item.id),
        ["old", "today", "urgent"]
    );
});
test("waiting tasks stay visible without a date and never become the first action", () => {
    const result = buildToday(
        [
            task("waiting", { stage: "waiting", priority: "urgent" }),
            task("late-waiting", { stage: "waiting", plannedFor: "2026-10-23" }),
            task("doing", { stage: "doing" })
        ],
        today
    );
    assert.equal(result.first?.id, "doing");
    assert.deepEqual(
        result.waiting.map((item) => item.id),
        ["late-waiting", "waiting"]
    );
    assert.deepEqual(result.overdue, []);
});
test("future, unscheduled, archived and deleted tasks do not overload the day", () => {
    const result = buildToday(
        [
            task("future", { stage: "doing", plannedFor: "2026-10-25" }),
            task("inbox"),
            task("archived", { stage: "doing", archived: true }),
            task("deleted", { stage: "waiting", deletedAt: "2026-10-23T12:00:00Z" }),
            task("done-old", { stage: "done", plannedFor: "2026-10-20" }),
            task("done-today", { stage: "done", plannedFor: today })
        ],
        today
    );
    assert.equal(result.first, null);
    assert.equal(result.waiting.length + result.overdue.length + result.planned.length, 0);
    assert.deepEqual(
        result.done.map((item) => item.id),
        ["done-today"]
    );
});
test("calendar rollover makes yesterday overdue and keeps ordering deterministic", () => {
    const tasks = [task("b", { plannedFor: "2026-12-31" }), task("a", { plannedFor: "2026-12-31" })];
    const result = buildToday(tasks, "2027-01-01");
    assert.equal(result.first?.id, "a");
    assert.deepEqual(
        result.overdue.map((item) => item.id),
        ["b"]
    );
    assert.match(firstReason(result.first!, "2027-01-01"), /Просрочено/);
});
