import assert from "node:assert/strict";
import { test } from "node:test";
import { createSafeStorage } from "../../src/lib/safe-storage";

test("storage denied at access time leaves a usable in-memory session", () => {
  let failures = 0;
  const s = createSafeStorage(() => { throw new Error("SecurityError"); }, () => failures++);
  assert.equal(s.getItem("save"), null);
  s.setItem("save", '{"state":1}');
  assert.equal(s.getItem("save"), '{"state":1}');
  assert.equal(failures, 1);
});
test("quota failure removes stale persisted progress and keeps latest in memory", () => {
  let old: string | null = '{"state":"old"}';
  const s = createSafeStorage(() => ({ getItem: () => old, setItem: () => { throw new Error("quota"); }, removeItem: () => { old = null; } }), () => {});
  s.getItem("save"); s.setItem("save", '{"state":"latest"}');
  assert.equal(s.getItem("save"), '{"state":"latest"}');
  assert.equal(old, null);
  s.removeItem("save"); assert.equal(s.getItem("save"), null);
});
test("malformed JSON does not reach the application's hydration parser", () => {
  const s = createSafeStorage(() => ({ getItem: () => "{broken", setItem() {}, removeItem() {} }), () => {});
  assert.equal(s.getItem("save"), null);
});
test("normal storage writes, reads and deletion round-trip", () => {
  const m = new Map<string,string>();
  const s = createSafeStorage(() => ({ getItem: k => m.get(k) ?? null, setItem: (k,v) => { m.set(k,v); }, removeItem: k => { m.delete(k); } }));
  s.setItem("save", '{"state":42}'); assert.equal(s.getItem("save"), '{"state":42}');
  s.removeItem("save"); assert.equal(s.getItem("save"), null);
});
