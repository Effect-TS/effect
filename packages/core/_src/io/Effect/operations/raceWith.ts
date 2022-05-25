import { IRaceWith } from "@effect/core/io/Effect/definition/primitives"

/**
 * Returns an effect that races this effect with the specified effect, calling
 * the specified finisher as soon as one result or the other has been computed.
 *
 * @tsplus fluent ets/Effect raceWith
 */
export function raceWith_<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R1, E1, A1>>,
  leftDone: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => Effect<R2, E2, A2>,
  rightDone: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => Effect<R3, E3, A3>,
  __tsplusTrace?: string
): Effect<R & R1 & R2 & R3, E2 | E3, A2 | A3> {
  return new IRaceWith(() => self, that, (winner, loser) =>
    winner.await().flatMap((exit) => {
      switch (exit._tag) {
        case "Success": {
          return winner.inheritRefs().flatMap(() => leftDone(exit, loser))
        }
        case "Failure": {
          return leftDone(exit, loser)
        }
      }
    }), (winner, loser) =>
    winner.await().flatMap((exit) => {
      switch (exit._tag) {
        case "Success": {
          return winner.inheritRefs().flatMap(() => rightDone(exit, loser))
        }
        case "Failure": {
          return rightDone(exit, loser)
        }
      }
    }), __tsplusTrace)
}

/**
 * Returns an effect that races this effect with the specified effect, calling
 * the specified finisher as soon as one result or the other has been computed.
 *
 * @tsplus static ets/Effect/Aspects raceWith
 */
export const raceWith = Pipeable(raceWith_)
