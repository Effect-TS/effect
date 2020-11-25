import * as E from "../Either"
import * as O from "../Option"
import type { Effect } from "."
import { succeed } from "./core"
import { fail } from "./fail"
import { foldM_ } from "./foldM"

/**
 * Returns a successful effect if the value is `Right`, or fails with the error `None`.
 */
export function right<R, E, B, C>(
  self: Effect<R, E, E.Either<B, C>>
): Effect<R, O.Option<E>, C> {
  return foldM_(
    self,
    (e) => fail(O.some(e)),
    E.fold(() => fail(O.none), succeed)
  )
}
