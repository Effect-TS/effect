import { TakeInternal } from "@effect/core/stream/Take/operations/_internal/TakeInternal"

/**
 * Creates a failing `Take<E, unknown>` with the specified failure.
 *
 * @tsplus static ets/Take/Ops fail
 */
export function fail<E>(e: E): Take<E, never> {
  return new TakeInternal(Exit.fail(Option.some(e)))
}
