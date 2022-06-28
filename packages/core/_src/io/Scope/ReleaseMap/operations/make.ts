import type { State } from "@effect/core/io/Scope/ReleaseMap/_internal/State"
import { Running } from "@effect/core/io/Scope/ReleaseMap/_internal/State"

/**
 * Creates a new `ReleaseMap`.
 *
 * @tsplus static effect/core/io/ReleaseMap.Ops make
 */
export const make = Effect.succeed(unsafeMake)

/**
 * Unsafely creates a new `ReleaseMap`.
 *
 * @tsplus static effect/core/io/ReleaseMap.Ops unsafeMake
 */
export function unsafeMake(): ReleaseMap {
  return ReleaseMap(Ref.unsafeMake<State>(new Running(0, new Map(), identity)))
}
