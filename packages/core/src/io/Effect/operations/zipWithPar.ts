/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 *
 * @tsplus static effect/core/io/Effect.Aspects zipWithPar
 * @tsplus pipeable effect/core/io/Effect zipWithPar
 */
export function zipWithPar<R2, E2, A2, A, B>(
  that: Effect<R2, E2, A2>,
  f: (a: A, b: A2) => B
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R | R2, E | E2, B> => {
    const g = (b: A2, a: A) => f(a, b)
    return Effect.uninterruptibleMask((mask) =>
      Effect.transplant((graft) =>
        Effect.fiberIdWith((fiberId) =>
          graft(mask.restore(self)).raceFibersWith(
            graft(mask.restore(that)),
            (w, l) => coordinate(fiberId, f, true, w, l),
            (w, l) => coordinate(fiberId, g, false, w, l)
          )
        )
      )
    )
  }
}

function coordinate<E, E1, B, X, Y>(
  fiberId: FiberId,
  f: (a: X, b: Y) => B,
  leftWinner: boolean,
  winner: Fiber<E, X>,
  loser: Fiber<E1, Y>
): Effect<never, E | E1, B> {
  return winner.await.flatMap((winnerExit) =>
    winnerExit.fold(
      (winnerCause) =>
        loser.interruptAs(fiberId).flatMap((loserExit) =>
          loserExit.fold(
            (loserCause) =>
              leftWinner ?
                Effect.failCause(winnerCause & loserCause) :
                Effect.failCause(loserCause & winnerCause),
            () => Effect.failCause(winnerCause)
          )
        ),
      (a) =>
        loser.await.flatMap((loserExit) =>
          loserExit.fold<E | E1, Y, Effect<never, E | E1, B>>(
            (loserCause) => Effect.failCause(loserCause),
            (b) => winner.inheritAll > loser.inheritAll > Effect.sync(f(a, b))
          )
        )
    )
  )
}
