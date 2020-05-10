import { Cause } from "../Exit"
import { NonEmptyArray } from "../NonEmptyArray"
import { Option } from "../Option"
import { Effect } from "../Support/Common/effect"

import { completed } from "./completed"
import { foldExit_ } from "./foldExit"
import { pure } from "./pure"

/**
 * Curriend form of chainError
 * @param f
 */
export function chainError<S, R, E1, E2, A>(
  f: (_: E1, remaining: Option<NonEmptyArray<Cause<any>>>) => Effect<S, R, E2, A>
): <S2, A2, R2>(rio: Effect<S2, R2, E1, A2>) => Effect<S | S2, R & R2, E2, A | A2> {
  return (io) => chainError_(io, f)
}

export function chainError_<S, R, E1, S2, R2, E2, A, A2>(
  io: Effect<S, R, E1, A>,
  f: (_: E1, remaining: Option<NonEmptyArray<Cause<any>>>) => Effect<S2, R2, E2, A2>
): Effect<S | S2, R & R2, E2, A | A2> {
  return foldExit_(
    io,
    (cause) =>
      cause._tag === "Raise" ? f(cause.error, cause.remaining) : completed(cause),
    pure
  )
}
