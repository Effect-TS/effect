import * as A from "../../Array"
import { pipe } from "../../Function"
import * as O from "../../Option"
import { InterruptedException } from "../Errors"

import { Cause } from "./cause"
import { defects } from "./defects"
import { failureOption } from "./failureOption"
import { interrupted } from "./interrupted"
import { interruptors } from "./interruptors"

/**
 * Squashes a `Cause` down to a single `Throwable`, chosen to be the
 * "most important" `Throwable`.
 */
export const squash = <E>(f: (e: E) => unknown) => (cause: Cause<E>): unknown =>
  pipe(
    cause,
    failureOption,
    O.map(f),
    O.alt(() =>
      interrupted(cause)
        ? O.some<unknown>(
            new InterruptedException(
              "Interrupted by fibers: " +
                Array.from(interruptors(cause))
                  .map((_) => _.seqNumber.toString())
                  .map((_) => "#" + _)
                  .join(", ")
            )
          )
        : O.none
    ),
    O.alt(() => A.head(defects(cause))),
    O.getOrElse(() => new InterruptedException())
  )
