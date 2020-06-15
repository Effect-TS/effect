import { Both } from "../Cause/cause"
import { Exit } from "../Exit/exit"
import { succeeded as succeededExit } from "../Exit/succeeded"
import { Fiber } from "../Fiber/fiber"
import { FiberID } from "../Fiber/id"
import { join } from "../Fiber/join"

import { chain_ } from "./chain_"
import { done } from "./done"
import { Effect } from "./effect"
import { fiberId } from "./fiberId"
import { fork } from "./fork"
import { halt } from "./halt"
import { map_ } from "./map_"
import { raceWith } from "./raceWith"

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

  return chain_(fiberId(), (parentFiberId) =>
    chain_(
      fork(
        raceWith(
          a,
          b,
          (ex, fi) => coordinateZipPar<E, E2>()(parentFiberId, f, true, ex, fi),
          (ex, fi) => coordinateZipPar<E, E2>()(parentFiberId, g, false, ex, fi)
        )
      ),
      (fi) =>
        chain_(fi.wait, (ex) => {
          if (succeededExit(ex)) {
            return chain_(fi.inheritRefs, () => done(ex))
          } else {
            return done(ex)
          }
        })
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
