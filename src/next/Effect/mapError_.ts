import { pipe } from "../../Function"
import * as O from "../../Option"
import { map } from "../Cause/core"

import { foldCauseM_, halt, succeed } from "./core"
import { Effect } from "./effect"

/**
 * Returns an effect with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger"
 * error.
 */
export const mapError_ = <S, R, E, E2, A>(self: Effect<S, R, E, A>, f: (e: E) => E2) =>
  foldCauseM_(
    self,
    (c) => pipe(c, map(f), halt),
    (a) => succeed(a)
  )

/**
 * Returns an effect with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger"
 * error.
 */
export const mapError = <E, E2>(f: (e: E) => E2) => <S, R, A>(
  self: Effect<S, R, E, A>
) => mapError_(self, f)

/**
 * Maps the error value of this effect to an optional value.
 */
export const asSomeError = <S, R, E, E2, A>(self: Effect<S, R, E, A>) =>
  mapError_(self, (e) => O.some(e))
