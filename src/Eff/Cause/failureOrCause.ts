import * as E from "../../Either"
import { pipe } from "../../Function"
import * as O from "../../Option"

import { Cause } from "./cause"
import { failureOption } from "./failureOption"

/**
 * Retrieve the first checked error on the `Left` if available,
 * if there are no checked errors return the rest of the `Cause`
 * that is known to contain only `Die` or `Interrupt` causes.
 * */
export const failureOrCause = <E>(cause: Cause<E>): E.Either<E, Cause<never>> =>
  pipe(
    cause,
    failureOption,
    O.map(E.left),
    O.getOrElse(() => E.right(cause as Cause<never>)) // no E inside this cause, can safely cast
  )
