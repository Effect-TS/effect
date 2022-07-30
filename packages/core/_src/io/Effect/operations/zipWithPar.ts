import { IRaceWith } from "@effect/core/io/Effect/definition/primitives"

/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 *
 * @tsplus static effect/core/io/Effect.Aspects zipWithPar
 * @tsplus pipeable effect/core/io/Effect zipWithPar
 */
export function zipWithPar<R2, E2, A2, A, B>(
  that: LazyArg<Effect<R2, E2, A2>>,
  f: (a: A, b: A2) => B,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R | R2, E | E2, B> => {
    const g = (b: A2, a: A) => f(a, b)
    return Effect.transplant((graft) =>
      Effect.descriptorWith((d) =>
        new IRaceWith(
          () => graft(self),
          () => graft(that),
          (winner, loser) => coordinate<E | E2, B, A, A2>(d.id, f, true, winner, loser),
          (winner, loser) => coordinate<E | E2, B, A2, A>(d.id, g, false, winner, loser)
        )
      )
    )
  }
}

function coordinate<E, B, X, Y>(
  fiberId: FiberId,
  f: (a: X, b: Y) => B,
  leftWinner: boolean,
  winner: Fiber<E, X>,
  loser: Fiber<E, Y>
): Effect<never, E, B> {
  return winner.await.flatMap((winnerExit) =>
    winnerExit.fold(
      (winnerCause) =>
        loser.interruptAs(fiberId).flatMap((loserExit) =>
          loserExit.fold(
            (loserCause) =>
              leftWinner ?
                Effect.failCauseSync(winnerCause & loserCause) :
                Effect.failCauseSync(loserCause & winnerCause),
            () => Effect.failCauseSync(winnerCause)
          )
        ),
      (a) =>
        loser.await.flatMap((loserExit) =>
          loserExit.fold<E, Y, Effect<never, E, B>>(
            (loserCause) => Effect.failCauseSync(loserCause),
            (b) => winner.inheritRefs > loser.inheritRefs > Effect.sync(f(a, b))
          )
        )
    )
  )
}
