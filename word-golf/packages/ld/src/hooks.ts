import { useContext } from "react";
import { LDContext } from "./context.js";
import type { Flags } from "./flags.js";
import type { TrackFn } from "./events.js";

/** All current flag values (typed). */
export function useFlags(): Flags {
  return useContext(LDContext).flags;
}

/** A single flag value by key. */
export function useFlag<K extends keyof Flags>(key: K): Flags[K] {
  return useContext(LDContext).flags[key];
}

/**
 * Returns the raw string variation value for a string-multivariate flag.
 * Fails safe to `"control"` when LD is unreachable, the flag is absent, or
 * the returned value is not a string — so the control path (existing behavior)
 * is always the fallback. Wire as: `useVariation(FLAG_KEYS.myFlag) === "v1"`.
 *
 * NEVER evaluate a multivariate flag through `useFlag` with a boolean — every
 * non-empty string is truthy, so "control" would take the treatment path.
 */
export function useVariation(key: keyof Flags, defaultValue = "control"): string {
  const raw = useContext(LDContext).flags[key];
  return typeof raw === "string" ? raw : defaultValue;
}

/** The typed metric tracker. No-ops when LD is not configured. */
export function useTrack(): TrackFn {
  return useContext(LDContext).track;
}

/** Whether a real LaunchDarkly client is connected. */
export function useLDLive(): boolean {
  return useContext(LDContext).live;
}
