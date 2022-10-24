import { TakeInternal } from "@effect/core/stream/Take/operations/_internal/TakeInternal"
import * as Option from "@fp-ts/data/Option"

/**
 * Creates a failing `Take<E, unknown>` with the specified failure.
 *
 * @tsplus static effect/core/stream/Take.Ops fail
 * @category constructors
 * @since 1.0.0
 */
export function fail<E>(e: E): Take<E, never> {
  return new TakeInternal(Exit.fail(Option.some(e)))
}
