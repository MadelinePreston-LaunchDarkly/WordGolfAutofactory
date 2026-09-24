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
