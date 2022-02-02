import type { LazyArg } from "../../../data/Function"
import { Cause } from "../../Cause"
import type { Exit } from "../../Exit/definition"
import type { Fiber } from "../../Fiber/definition"
import { join as fiberJoin } from "../../Fiber/operations/join"
import type { FiberId } from "../../FiberId/definition"
import { Effect } from "../definition"

/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 *
 * @tsplus fluent ets/Effect zipWithPar
 */
export function zipWithPar_<R, E, A, R2, E2, A2, B>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  f: (a: A, b: A2) => B,
  __etsTrace?: string
): Effect<R & R2, E | E2, B> {
  const g = (b: A2, a: A) => f(a, b)
  return Effect.transplant((graft) =>
    Effect.descriptorWith((d) =>
      graft(self).raceWith(
        graft(that),
        (ex, fi) => coordinateZipPar<E | E2, B, A, A2>(d.id, f, true, ex, fi),
        (ex, fi) => coordinateZipPar<E | E2, B, A2, A>(d.id, g, false, ex, fi)
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
  that: LazyArg<Effect<R2, E2, A2>>,
  f: (a: A, b: A2) => B,
  __etsTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R2, E | E2, B> =>
    self.zipWithPar(that, f)
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
      return loser.inheritRefs.flatMap(() =>
        fiberJoin(loser).map((y) => f(winner.value, y))
      )
    }
    case "Failure": {
      return loser.interruptAs(fiberId).flatMap((e) => {
        switch (e._tag) {
          case "Success": {
            return Effect.failCauseNow(winner.cause)
          }
          case "Failure": {
            return leftWinner
              ? Effect.failCauseNow(Cause.both(winner.cause, e.cause))
              : Effect.failCauseNow(Cause.both(e.cause, winner.cause))
          }
        }
      })
    }
  }
}
