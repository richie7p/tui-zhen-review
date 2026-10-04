import assert from "node:assert/strict";
import { test } from "node:test";
import { extractSignals, runSimulation } from "../../src/lib/simulator/engine";
import { SAMPLES } from "../../src/lib/simulator/samples";
import { EMPTY_PROFILE, DEFAULT_PREFS } from "../../src/lib/simulator/types";
import { englishFieldError, parseNum, rankErrors, validateProfile } from "../../src/lib/simulator/validate";
import { applyWhatIf, availableMoves, scoreInterviewDetailed, voteDiff } from "../../src/lib/simulator/whatif";
import { restoreCase } from "../../src/store/case-persistence";
import { useCaseStore } from "../../src/store/case-store";

const sample = SAMPLES[0]!.profile;
const now = () => new Date("2026-10-04T00:00:00Z");
test("same material, committee, assumptions and clock reproduce the entire review", () => {
  assert.deepEqual(runSimulation(sample, ["a", "b"], { now }), runSimulation(sample, ["a", "b"], { now }));
});
test("each committee member has exactly one vote", () => {
  const r = runSimulation(sample, ["a", "a", "unknown", "b"], { now });
  assert.deepEqual(r.reviews.map(r => r.professorId), ["a", "b"]);
  assert.equal(r.committee.votes.length, 2);
});
test("blank GPA remains missing, not a numerical zero", () => {
  assert.equal(parseNum("  "), null);
  assert.equal(extractSignals(EMPTY_PROFILE).gpa100, null);
  assert.equal(validateProfile(EMPTY_PROFILE).ok, false);
});
test("GPA scales reject out-of-range and nonfinite values", () => {
  for (const [gpaScale, bad, good] of [["4.3", "4.31", "4.3"], ["4.0", "4.1", "4"], ["100", "101", "100"]] as const) {
    assert.equal(validateProfile({ ...sample, gpaScale, gpaValue: bad }).ok, false);
    assert.equal(validateProfile({ ...sample, gpaScale, gpaValue: good }).ok, true);
  }
  assert.equal(validateProfile({ ...sample, gpaValue: "Infinity" }).ok, false);
});
test("rank must be paired positive integers within class size", () => {
  for (const [classRank, classSize] of [["0", "50"], ["51", "50"], ["2.5", "50"], ["1", ""], ["", "10"]]) assert.ok(Object.keys(rankErrors({ ...sample, classRank, classSize })).length);
  assert.deepEqual(rankErrors({ ...sample, classRank: "1", classSize: "1" }), {});
});
test("TOEIC and IELTS enforce their respective score steps", () => {
  assert.ok(englishFieldError({ ...sample, englishScore: "913" }));
  assert.equal(englishFieldError({ ...sample, englishScore: "990" }), null);
  assert.ok(englishFieldError({ ...sample, englishType: "ielts", englishVersion: "ielts-academic", englishScore: "6.3" }));
  assert.equal(englishFieldError({ ...sample, englishType: "ielts", englishVersion: "ielts-academic", englishScore: "6.5" }), null);
});
test("all fictional sample outputs remain finite, bounded and evidence-labelled", () => {
  for (const s of SAMPLES) {
    const r = runSimulation(s.profile, [], { now });
    assert.equal(r.reviews.length, 5);
    for (const review of r.reviews) {
      assert.ok(Number.isFinite(review.score) && review.score >= 0 && review.score <= 100);
      for (const note of [...review.strengths, ...review.weaknesses]) assert.ok(["stated", "inferred", "missing"].includes(note.evidence.kind));
    }
  }
});
test("display name does not alter scoring or votes", () => {
  const a = runSimulation(sample, ["a", "b"]);
  const b = runSimulation({ ...sample, name: "匿名" }, ["a", "b"]);
  assert.deepEqual(a.signals, b.signals);
  assert.deepEqual(a.committee.votes, b.committee.votes);
});
test("top-ten-percent what-if actually meets ten percent for nonmultiples of ten", () => {
  const p = { ...sample, classSize: "62", classRank: "20" };
  const q = applyWhatIf(p, ["rankTop10"]);
  assert.ok(Number(q.classRank) / Number(q.classSize) <= .1);
  assert.equal(p.classRank, "20");
  const small = { ...sample, classSize: "5", classRank: "3" };
  const first = applyWhatIf(small, ["rankTop10"]);
  assert.equal(first.classSize, "5");
  assert.equal(first.classRank, "1");
  assert.equal(availableMoves(small).find(m => m.id === "rankTop10")?.label, "班排進第 1 名");
});
test("interview scoring caps repeated committee answers", () => {
  const r = scoreInterviewDetailed(Array.from({length: 10}, () => ({ professorId: "a", text: "question" })), Array(10).fill("驗證實驗架構資料個人貢獻".repeat(20)));
  assert.equal(r.byProfessor.a, 8);
  assert.equal(r.spillover, 4);
  assert.equal(scoreInterviewDetailed([{ professorId: "a", text: "q" }], ["short"]).byProfessor.a, undefined);
});
test("unchanged simulation has no vote flips", () => {
  const r = runSimulation(sample, [], { now });
  assert.ok(voteDiff(r, r).every(v => !v.flipped));
});
test("corrupt, legacy and forged case payloads reset safely", () => {
  for (const value of [null, [], { profile: null }, { profile: { ...sample, name: 44 } }]) assert.deepEqual(restoreCase(value).profile, EMPTY_PROFILE);
});
test("draft restoration validates settings and ignores stored verdicts/steps", () => {
  const r = restoreCase({ profile: sample, selectedIds: ["a", "a", "invalid"], prefs: DEFAULT_PREFS, step: "session", result: { committee: "forged" } });
  assert.deepEqual(r.selectedIds, ["a"]);
  assert.equal("result" in r, false);
  assert.equal("step" in r, false);
});
test("reset during an in-flight review cannot resurrect old personal data", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  useCaseStore.getState().setProfile(sample);
  assert.equal(useCaseStore.getState().startReview().ok, true);
  useCaseStore.getState().reset();
  t.mock.timers.tick(1200);
  assert.equal(useCaseStore.getState().result, null);
  assert.deepEqual(useCaseStore.getState().profile, EMPTY_PROFILE);
  assert.equal(useCaseStore.getState().reviewing, false);
});
test("editing during review invalidates the pending result and releases overlay", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  useCaseStore.getState().setProfile(sample);
  useCaseStore.getState().startReview();
  useCaseStore.getState().patchProfile({ gpaValue: "2.0" });
  t.mock.timers.tick(1200);
  assert.equal(useCaseStore.getState().result, null);
  assert.equal(useCaseStore.getState().reviewing, false);
});
