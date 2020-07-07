import { SyncE } from "./effect"
import { IEffectPartial } from "./primitives"

/**
 * Imports a synchronous side-effect into a pure value, translating any
 * thrown exceptions into typed failed effects creating with `halt`.
 */
export const effectPartial = <E>(onThrow: (u: unknown) => E) => <A>(
  effect: () => A
): SyncE<E, A> => new IEffectPartial(effect, onThrow)
