import * as Option from "@fp-ts/data/Option"

/**
 * Returns the `E` associated with the first `Fail` in this `Cause` if one
 * exists.
 *
 * @tsplus getter effect/core/io/Cause failureOption
 * @category destructors
 * @since 1.0.0
 */
export function failureMaybe<E>(self: Cause<E>): Option.Option<E> {
  return self.find((cause) => cause.isFailType() ? Option.some(cause.value) : Option.none)
}
