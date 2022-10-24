/**
 * Returns an effect that races this effect with the specified effect, calling
 * the specified finisher as soon as one result or the other has been computed.
 *
 * @tsplus static effect/core/io/Effect.Aspects raceWith
 * @tsplus pipeable effect/core/io/Effect raceWith
 * @category mutations
 * @since 1.0.0
 */
export function raceWith<E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  that: Effect<R1, E1, A1>,
  leftDone: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => Effect<R2, E2, A2>,
  rightDone: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => Effect<R3, E3, A3>
) {
  return <R>(self: Effect<R, E, A>): Effect<R | R1 | R2 | R3, E2 | E3, A2 | A3> =>
    self.raceFibersWith(
      that,
      (winner, loser) =>
        winner.await.flatMap((exit) => {
          switch (exit._tag) {
            case "Success": {
              return winner.inheritAll.flatMap(() => leftDone(exit, loser))
            }
            case "Failure": {
              return leftDone(exit, loser)
            }
          }
        }),
      (winner, loser) =>
        winner.await.flatMap((exit) => {
          switch (exit._tag) {
            case "Success": {
              return winner.inheritAll.flatMap(() => rightDone(exit, loser))
            }
            case "Failure": {
              return rightDone(exit, loser)
            }
          }
        })
    )
}
