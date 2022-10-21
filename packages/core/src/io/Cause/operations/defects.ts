/**
 * Extracts a list of non-recoverable errors from the `Cause`.
 *
 * @tsplus getter effect/core/io/Cause defects
 */
export function defects<E>(self: Cause<E>): List<unknown> {
  return self
    .foldLeft(
      List.empty<unknown>(),
      (causes, cause) => cause.isDieType() ? Maybe.some(causes.prepend(cause.value)) : Maybe.none
    )
    .reverse
}
