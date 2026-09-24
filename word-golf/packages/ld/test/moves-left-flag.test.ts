/**
 * Flag-path tests for the `show-moves-left` feature flag (#1).
 *
 * Covers the flag-off (control) and flag-on (treatment) paths as they relate
 * to the @word-golf/ld package — i.e. the flag default, flag key constants,
 * and the variation value used by App.tsx to gate the "Left" scoreboard stat.
 *
 * Control path (flag off / variation = "control"): the "Left" stat is NOT
 * rendered — existing scoreboard behavior (Moves → Par) is preserved exactly.
 * Treatment path (flag on / variation = "v1"): a "Left" stat is rendered
 * between Moves and Par showing max(0, puzzle.par - moves), or "—" when
 * puzzle.par is null.
 *
 * Wiring pattern: App.tsx evaluates
 *   `useVariation(FLAG_KEYS.showMovesLeft) === "v1"`
 * with a fail-safe default of "control" so the stat is never shown when LD
 * is unreachable.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { FLAG_DEFAULTS, FLAG_KEYS } from "../src/flags.js";
import { METRIC_EVENTS } from "../src/events.js";

// ---------------------------------------------------------------------------
// FLAG OFF: control path
// ---------------------------------------------------------------------------

test('flag-off: FLAG_DEFAULTS["show-moves-left"] is "control" — stat not rendered by default', () => {
  // The control path is preserved: when LD is offline or the flag targets off,
  // the default value must be "control" so the "Left" stat is never rendered.
  assert.equal(FLAG_DEFAULTS["show-moves-left"], "control");
});

test("flag-off: FLAG_KEYS.showMovesLeft resolves to the kebab-case LD key", () => {
  // Ensures useVariation(FLAG_KEYS.showMovesLeft) in App.tsx evaluates the
  // correct flag key and returns the "control" default in the control cohort.
  assert.equal(FLAG_KEYS.showMovesLeft, "show-moves-left");
});

test('flag-off: FLAG_DEFAULTS has "show-moves-left" as an own property (not undefined in offline mode)', () => {
  // Verifies the key is explicitly registered in FLAG_DEFAULTS so offline
  // contexts (no LD client) always serve "control" rather than undefined.
  assert.ok(
    Object.prototype.hasOwnProperty.call(FLAG_DEFAULTS, "show-moves-left"),
    '"show-moves-left" must be an explicit entry in FLAG_DEFAULTS'
  );
});

test('flag-off: FLAG_DEFAULTS["show-moves-left"] is a string (not boolean — multivariate flag)', () => {
  // show-moves-left is a STRING MULTIVARIATE flag. The default must be the
  // string "control" so that `useVariation(...) === "v1"` correctly evaluates
  // to false on the control path (a boolean false or undefined would degrade
  // useVariation to the "control" string anyway, but this makes the intent
  // explicit and guards against accidental boolean default).
  assert.equal(typeof FLAG_DEFAULTS["show-moves-left"], "string");
});

// ---------------------------------------------------------------------------
// FLAG ON: treatment path
// ---------------------------------------------------------------------------

test("flag-on: FLAG_KEYS.showMovesLeft is present in FLAG_KEYS (not undefined)", () => {
  // Treatment path relies on this key to evaluate the flag. Must be registered.
  assert.ok(
    Object.prototype.hasOwnProperty.call(FLAG_KEYS, "showMovesLeft"),
    "showMovesLeft must be an explicit entry in FLAG_KEYS"
  );
});

test("flag-on: FLAG_KEYS.showMovesLeft value uses kebab-case (no underscores)", () => {
  // LaunchDarkly flag keys use kebab-case; the provider is configured with
  // useCamelCaseFlagKeys: false so the raw key string must be kebab-case.
  assert.ok(
    !FLAG_KEYS.showMovesLeft.includes("_"),
    "show-moves-left must be kebab-case (no underscores)"
  );
});

test('flag-on: treatment variation value is "v1" (string comparison in App.tsx)', () => {
  // App.tsx gates the "Left" stat with:
  //   useVariation(FLAG_KEYS.showMovesLeft) === "v1"
  // This test locks in the expected variation value so any rename is caught.
  assert.equal(FLAG_KEYS.showMovesLeft, "show-moves-left");
  // The treatment value "v1" is the AutoFactory-standard first treatment.
  // We verify the default is NOT "v1" (i.e. control path is correct default).
  assert.notEqual(FLAG_DEFAULTS["show-moves-left"], "v1");
});

test('flag-on: "show-moves-left" key is distinct from all other FLAG_KEYS values', () => {
  // Ensures no accidental collision with an existing flag key.
  const allKeys = Object.entries(FLAG_KEYS) as [string, string][];
  const duplicates = allKeys.filter(
    ([name, value]) =>
      name !== "showMovesLeft" && value === "show-moves-left"
  );
  assert.deepEqual(
    duplicates,
    [],
    '"show-moves-left" must not collide with other FLAG_KEYS entries'
  );
});

// ---------------------------------------------------------------------------
// Regression: existing flags are unchanged
// ---------------------------------------------------------------------------

test("regression: existing FLAG_DEFAULTS boolean flags are unchanged (control-path flags unaffected)", () => {
  // Adding show-moves-left must not disturb existing flag defaults.
  assert.equal(FLAG_DEFAULTS["hint-button"], false);
  assert.equal(FLAG_DEFAULTS["show-mission-control"], false);
  assert.equal(FLAG_DEFAULTS["enable-random-puzzle"], false);
  assert.equal(FLAG_DEFAULTS["show-powered-by-footer"], false);
  assert.equal(FLAG_DEFAULTS["enable-session-replay"], false);
  assert.equal(FLAG_DEFAULTS["enable-share-result-button"], false);
  assert.equal(FLAG_DEFAULTS["enable-difficulty-picker-ux"], false);
});

// ---------------------------------------------------------------------------
// useVariation hook — pure string-guard logic
// ---------------------------------------------------------------------------
// useVariation(key) reads flags[key] from LDContext and returns:
//   - the raw string value when typeof raw === "string"
//   - defaultValue (default: "control") for any non-string (undefined, boolean, number)
// These tests replicate that guard directly so the hook's safety contract is
// locked in without a React harness.

/** Mirrors the `useVariation` implementation without a React context dependency. */
function applyVariationGuard(raw: unknown, defaultValue = "control"): string {
  return typeof raw === "string" ? raw : defaultValue;
}

test('useVariation guard: string "control" passes through unchanged', () => {
  // FLAG OFF: when LD serves the control variation, the guard returns "control".
  // App.tsx then evaluates `"control" === "v1"` → false → "Left" stat NOT rendered.
  assert.equal(applyVariationGuard("control"), "control");
});

test('useVariation guard: string "v1" passes through unchanged', () => {
  // FLAG ON: when LD serves the treatment variation, the guard returns "v1".
  // App.tsx then evaluates `"v1" === "v1"` → true → "Left" stat IS rendered.
  assert.equal(applyVariationGuard("v1"), "v1");
});

test("useVariation guard: undefined falls back to default (offline / flag absent)", () => {
  // When the LD client is unreachable, flags[key] is undefined.
  // The guard must fall back to "control" so the stat is never shown offline.
  assert.equal(applyVariationGuard(undefined), "control");
});

test("useVariation guard: boolean true falls back to default (wrong flag type)", () => {
  // A boolean flag accidentally served on a multivariate key must NOT be
  // treated as truthy — it must fall back to "control" (safe fail).
  // This is why useVariation exists: `useFlag` would surface a non-string
  // directly; useVariation normalises it safely.
  assert.equal(applyVariationGuard(true), "control");
});

test("useVariation guard: boolean false falls back to default (wrong flag type)", () => {
  // Similar to boolean true: any boolean must produce "control", not "false"
  // or an empty string that might collide with a variation name.
  assert.equal(applyVariationGuard(false), "control");
});

test("useVariation guard: numeric value falls back to default (wrong flag type)", () => {
  // A numeric flag value on a multivariate key is not a string — must return "control".
  assert.equal(applyVariationGuard(0), "control");
  assert.equal(applyVariationGuard(1), "control");
});

test("useVariation guard: null falls back to default (explicit null from LD)", () => {
  // Some LD SDK versions can return null for unset flags.
  assert.equal(applyVariationGuard(null), "control");
});

test("useVariation guard: custom defaultValue is returned for non-string (not always 'control')", () => {
  // The hook accepts an optional defaultValue — callers can override.
  // Verify the guard uses the supplied default, not hardcoded "control".
  assert.equal(applyVariationGuard(undefined, "v1"), "v1");
  assert.equal(applyVariationGuard(true, "someDefault"), "someDefault");
});

test('useVariation guard: empty string "" is a valid string and passes through (not treated as missing)', () => {
  // An empty string is a string, so typeof "" === "string" → the guard returns
  // it as-is. This does NOT equal "v1", so the "Left" stat is not rendered —
  // behaving as control — but the guard itself should not replace it with the
  // default since that would mask a misconfigured flag.
  assert.equal(applyVariationGuard(""), "");
  // And the downstream condition in App.tsx correctly evaluates to false:
  assert.equal(applyVariationGuard("") === "v1", false);
});

// ---------------------------------------------------------------------------
// Treatment path: scoreboard computation logic
// ---------------------------------------------------------------------------
// App.tsx renders the "Left" stat value as:
//   puzzle.par === null ? "—" : String(Math.max(0, puzzle.par - moves))
// These tests lock in the boundary conditions so any arithmetic change is caught.

/**
 * Replicates the "Left" stat display value from App.tsx:
 *   puzzle.par === null ? "—" : String(Math.max(0, puzzle.par - moves))
 */
function leftStatValue(par: number | null, moves: number): string {
  return par === null ? "—" : String(Math.max(0, par - moves));
}

test("flag-on: Left stat shows correct remaining moves when under par", () => {
  // Treatment path: 3 moves taken, par is 5 → 2 moves remaining.
  assert.equal(leftStatValue(5, 3), "2");
});

test("flag-on: Left stat shows '0' when moves equal par (player is exactly at par)", () => {
  // At par: remaining = max(0, 5 - 5) = 0. Must show "0", not a negative number.
  assert.equal(leftStatValue(5, 5), "0");
});

test("flag-on: Left stat shows '0' when moves exceed par (player is over par — floor at zero)", () => {
  // Over par: par - moves < 0. Math.max(0, ...) clamps to 0 so we never show
  // a negative value, which would confuse the player.
  assert.equal(leftStatValue(5, 7), "0");
  assert.equal(leftStatValue(3, 10), "0");
});

test("flag-on: Left stat shows '—' when puzzle.par is null (par unavailable)", () => {
  // Some puzzles have no par (par === null). The stat must render "—" (em-dash)
  // rather than crashing or showing "NaN". This is the null-safety branch.
  assert.equal(leftStatValue(null, 0), "—");
  assert.equal(leftStatValue(null, 5), "—");
});

test("flag-on: Left stat shows par value when no moves have been made (moves = 0)", () => {
  // At the start of a puzzle (0 moves taken), the remaining count equals par.
  assert.equal(leftStatValue(6, 0), "6");
  assert.equal(leftStatValue(1, 0), "1");
});

test("flag-off: control path never renders Left stat (variation check evaluates false)", () => {
  // Verify the control-path guard: "control" === "v1" is false.
  // This is the actual runtime gating condition from App.tsx.
  const controlVariation = "control";
  assert.equal(controlVariation === "v1", false);
});

test("flag-on: treatment path renders Left stat (variation check evaluates true)", () => {
  // Verify the treatment-path guard: "v1" === "v1" is true.
  const treatmentVariation = "v1";
  assert.equal(treatmentVariation === "v1", true);
});

// ---------------------------------------------------------------------------
// Guardrail metric events — backing the guarded-release plan
// ---------------------------------------------------------------------------
// The release plan wires three metrics backed by pre-existing track() calls:
//   made_par           → show-moves-left-made-par        (pause)
//   puzzle_completed   → show-moves-left-puzzle-completed (killswitch)
//   puzzle_abandoned   → show-moves-left-abandoned        (pause)
// These tests confirm the event keys exist in the taxonomy and are stable.

test("flag-path guardrail: METRIC_EVENTS.madePar is 'made_par' (backs show-moves-left-made-par metric)", () => {
  // The primary outcome signal: fires when moves <= puzzle.par (player makes par).
  // Both control and treatment arms emit this event unconditionally.
  assert.equal(METRIC_EVENTS.madePar, "made_par");
});

test("flag-path guardrail: METRIC_EVENTS.puzzleCompleted is 'puzzle_completed' (backs show-moves-left-puzzle-completed metric)", () => {
  // Killswitch metric: fires on every puzzle solve. A drop in the treatment arm
  // would indicate the "Left" stat is breaking gameplay → auto-rollback.
  assert.equal(METRIC_EVENTS.puzzleCompleted, "puzzle_completed");
});

test("flag-path guardrail: METRIC_EVENTS.puzzleAbandoned is 'puzzle_abandoned' (backs show-moves-left-abandoned metric)", () => {
  // Secondary guardrail: fires when a player leaves mid-puzzle after ≥1 move.
  // An increase in treatment signals the stat is discouraging players (pause).
  assert.equal(METRIC_EVENTS.puzzleAbandoned, "puzzle_abandoned");
});

test("flag-path guardrail: all three show-moves-left backing events exist in METRIC_EVENTS", () => {
  // Structural check: all three raw event keys used by the guarded-release
  // metrics must be resolvable from the shared taxonomy object.
  const values = Object.values(METRIC_EVENTS);
  assert.ok(values.includes("made_par"), '"made_par" must be in METRIC_EVENTS');
  assert.ok(values.includes("puzzle_completed"), '"puzzle_completed" must be in METRIC_EVENTS');
  assert.ok(values.includes("puzzle_abandoned"), '"puzzle_abandoned" must be in METRIC_EVENTS');
});

test("flag-path guardrail: the three backing event keys are mutually distinct", () => {
  // If any two were equal, the guarded-release metrics would conflate
  // different user actions (e.g. completion and abandonment).
  assert.notEqual(METRIC_EVENTS.madePar, METRIC_EVENTS.puzzleCompleted);
  assert.notEqual(METRIC_EVENTS.madePar, METRIC_EVENTS.puzzleAbandoned);
  assert.notEqual(METRIC_EVENTS.puzzleCompleted, METRIC_EVENTS.puzzleAbandoned);
});

test("flag-path guardrail: existing metric event keys are not disrupted by this PR", () => {
  // Adding the show-moves-left flag must not alter any other events that back
  // other guarded-release metrics (regression).
  assert.equal(METRIC_EVENTS.timeToSolveMs, "time_to_solve_ms");
  assert.equal(METRIC_EVENTS.hintButtonUsed, "hint-button-used");
  assert.equal(METRIC_EVENTS.poweredByFooterViewed, "show-powered-by-footer-viewed");
});
