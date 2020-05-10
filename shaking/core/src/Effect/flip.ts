import { Effect } from "../Support/Common/effect"

import { completed } from "./completed"
import { foldExit_ } from "./foldExit"
import { pure } from "./pure"
import { raiseError } from "./raiseError"

/**
 * Flip the error and success channels in an IO
 * @param io
 */
export function flip<S, R, E, A>(io: Effect<S, R, E, A>): Effect<S, R, A, E> {
  return foldExit_(
    io,
    (error) => (error._tag === "Raise" ? pure(error.error) : completed(error)),
    raiseError
  )
}
