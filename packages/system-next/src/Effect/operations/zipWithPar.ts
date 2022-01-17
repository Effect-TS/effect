import { both } from "../../Cause/definition"
import type { Exit } from "../../Exit/definition"
import type { Fiber } from "../../Fiber/definition"
import { join } from "../../Fiber/operations/join"
import type { FiberId } from "../../FiberId/definition"
import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { descriptorWith } from "./descriptorWith"
import { failCause } from "./failCause"
import { map_ } from "./map"
import { raceWith_ } from "./raceWith"
import { transplant } from "./transplant"

/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 */
export function zipWithPar_<R, E, A, R2, E2, A2, B>(
  a: Effect<R, E, A>,
  b: Effect<R2, E2, A2>,
  f: (a: A, b: A2) => B,
  __trace?: string
): Effect<R & R2, E | E2, B> {
  const g = (b: A2, a: A) => f(a, b)

  return transplant((graft) =>
    descriptorWith((d) =>
      raceWith_(
        graft(a),
        graft(b),
        (ex, fi) => coordinateZipPar<E | E2, B, A, A2>(d.id, f, true, ex, fi),
        (ex, fi) => coordinateZipPar<E | E2, B, A2, A>(d.id, g, false, ex, fi),
        __trace
      )
    )
  )
}

/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 *
 * @ets_data_first zipWithPar_
 */
export function zipWithPar<A, R2, E2, A2, B>(
  b: Effect<R2, E2, A2>,
  f: (a: A, b: A2) => B,
  __trace?: string
) {
  return <R, E>(a: Effect<R, E, A>): Effect<R & R2, E | E2, B> =>
    zipWithPar_(a, b, f, __trace)
}

function coordinateZipPar<E, B, X, Y>(
  fiberId: FiberId,
  f: (a: X, b: Y) => B,
  leftWinner: boolean,
  winner: Exit<E, X>,
  loser: Fiber<E, Y>
) {
  switch (winner._tag) {
    case "Success": {
      return chain_(loser.inheritRefs, () =>
        map_(join(loser), (y) => f(winner.value, y))
      )
    }
    case "Failure": {
      return chain_(loser.interruptAs(fiberId), (e) => {
        switch (e._tag) {
          case "Success": {
            return failCause(winner.cause)
          }
          case "Failure": {
            return leftWinner
              ? failCause(both(winner.cause, e.cause))
              : failCause(both(e.cause, winner.cause))
          }
        }
      })
    }
  }
}
