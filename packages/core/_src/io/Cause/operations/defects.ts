/**
 * Extracts a list of non-recoverable errors from the `Cause`.
 *
 * @tsplus fluent ets/Cause defects
 */
export function defects<E>(self: Cause<E>): List<unknown> {
  return self
    .foldLeft(
      List.empty<unknown>(),
      (causes, cause) => cause.isDieType() ? Option.some(causes.prepend(cause.value)) : Option.none
    )
    .reverse()
}
