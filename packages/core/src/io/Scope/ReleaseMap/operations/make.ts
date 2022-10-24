import type { State } from "@effect/core/io/Scope/ReleaseMap/_internal/State"
import { Running } from "@effect/core/io/Scope/ReleaseMap/_internal/State"
import { identity } from "@fp-ts/data/Function"

/**
 * Creates a new `ReleaseMap`.
 *
 * @tsplus static effect/core/io/ReleaseMap.Ops make
 * @category constructors
 * @since 1.0.0
 */
export const make = Effect.sync(unsafeMake)

/**
 * Unsafely creates a new `ReleaseMap`.
 *
 * @tsplus static effect/core/io/ReleaseMap.Ops unsafeMake
 * @category constructors
 * @since 1.0.0
 */
export function unsafeMake(): ReleaseMap {
  return ReleaseMap(Ref.unsafeMake<State>(new Running(0, new Map(), identity)))
}
