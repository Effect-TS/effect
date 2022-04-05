import { TakeInternal } from "@effect-ts/core/stream/Take/operations/_internal/TakeInternal";

/**
 * Creates a failing `Take<E, never>` with the specified cause.
 *
 * @tsplus static ets/Take/Ops failCause
 */
export function failCause<E>(cause: Cause<E>): Take<E, never> {
  return new TakeInternal(Exit.failCause(cause.map(Option.some)));
}
