import { TakeInternal } from "@effect/core/stream/Take/operations/_internal/TakeInternal"
import * as Option from "@fp-ts/data/Option"

/**
 * Creates a failing `Take<E, never>` with the specified cause.
 *
 * @tsplus static effect/core/stream/Take.Ops failCause
 * @category constructors
 * @since 1.0.0
 */
export function failCause<E>(cause: Cause<E>): Take<E, never> {
  return new TakeInternal(Exit.failCause(cause.map(Option.some)))
}
