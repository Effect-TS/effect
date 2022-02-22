// ets_tracing: off

// ets_tracing: off
import { combinePar } from "../Cause/cause.js"
import type { Exit } from "../Exit/exit.js"
import type { Fiber } from "../Fiber/core.js"
import { join } from "../Fiber/core.js"
import type { FiberID } from "../Fiber/id.js"
import { chain_, descriptorWith, halt } from "./core.js"
import { raceWith_, transplant } from "./core-scope.js"
import type { Effect } from "./effect.js"
import { map_ } from "./map.js"

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

function coordinateZipPar<E, B, X, Y>(
  fiberId: FiberID,
  f: (a: X, b: Y) => B,
  leftWinner: boolean,
  winner: Exit<E, X>,
  loser: Fiber<E, Y>
) {
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
              ? halt(combinePar(winner.cause, e.cause))
              : halt(combinePar(e.cause, winner.cause))
          }
        }
      })
    }
  }
}

/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 */
export function zipWithPar<A, R2, E2, A2, B>(
  b: Effect<R2, E2, A2>,
  f: (a: A, b: A2) => B,
  __trace?: string
) {
  return <R, E>(a: Effect<R, E, A>): Effect<R & R2, E | E2, B> =>
    zipWithPar_(a, b, f, __trace)
}
