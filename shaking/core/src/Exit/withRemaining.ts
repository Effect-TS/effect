import type { NonEmptyArray } from "../NonEmptyArray"
import { some } from "../Option"

import type { Cause } from "./Exit"

export const withRemaining = <E>(
  cause: Cause<E>,
  ...remaining: Array<Cause<any>>
): Cause<E> => {
  const rem =
    cause.remaining._tag === "Some"
      ? [...cause.remaining.value, ...remaining]
      : remaining
  return rem.length > 0
    ? {
        ...cause,
        remaining: some(rem as NonEmptyArray<Cause<any>>)
      }
    : cause
}
