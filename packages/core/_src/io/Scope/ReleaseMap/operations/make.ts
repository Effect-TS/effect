import type { State } from "@effect-ts/core/io/Scope/ReleaseMap/_internal/State";
import { Running } from "@effect-ts/core/io/Scope/ReleaseMap/_internal/State";

/**
 * Creates a new `ReleaseMap`.
 *
 * @tsplus static ets/ReleaseMap/Ops make
 */
export const make = Effect.succeed(unsafeMake);

/**
 * Unsafely creates a new `ReleaseMap`.
 *
 * @tsplus static ets/ReleaseMap/Ops unsafeMake
 */
export function unsafeMake(): ReleaseMap {
  return ReleaseMap(Ref.unsafeMake<State>(new Running(0, new Map(), identity)));
}
