import { Both } from "../Cause/cause"
import { Exit } from "../Exit/exit"
import { join } from "../Fiber/api"
import { Fiber } from "../Fiber/core"
import { FiberID } from "../Fiber/id"

import { chain_, checkDescriptor, halt, raceWith } from "./core"
import { Effect } from "./effect"
import { map_ } from "./map_"
import { transplant } from "./transplant"

/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 */
export const zipWithPar_ = <S, R, E, A, S2, R2, E2, A2, B>(
  a: Effect<S, R, E, A>,
  b: Effect<S2, R2, E2, A2>,
  f: (a: A, b: A2) => B
): Effect<unknown, R & R2, E | E2, B> => {
  const g = (b: A2, a: A) => f(a, b)

  return transplant((graft) =>
    checkDescriptor((d) =>
      raceWith(
        graft(a),
        graft(b),
        (ex, fi) => coordinateZipPar<E, E2>()(d.id, f, true, ex, fi),
        (ex, fi) => coordinateZipPar<E, E2>()(d.id, g, false, ex, fi)
      )
    )
  )
}
const coordinateZipPar = <E, E2>() => <B, X, Y>(
  fiberId: FiberID,
  f: (a: X, b: Y) => B,
  leftWinner: boolean,
  winner: Exit<E | E2, X>,
  loser: Fiber<E | E2, Y>
) => {
  switch (winner._tag) {
    case "Success": {
      return map_(join(loser), (y) => f(winner.value, y))
    }
    case "Failure": {
      return chain_(loser.interruptAs(fiberId), (e) => {
        switch (e._tag) {
          case "Success": {
            return halt(winner.cause)
          }
          case "Failure": {
            return leftWinner
              ? halt(Both(winner.cause, e.cause))
              : halt(Both(e.cause, winner.cause))
          }
        }
      })
    }
  }
}
