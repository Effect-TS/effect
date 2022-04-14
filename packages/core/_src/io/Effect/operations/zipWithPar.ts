import { IRaceWith } from "@effect/core/io/Effect/definition/primitives";

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
  __tsplusTrace?: string
): Effect<R & R2, E | E2, B> {
  const g = (b: A2, a: A) => f(a, b);
  return Effect.transplant((graft) =>
    Effect.descriptorWith((d) =>
      new IRaceWith(
        () => graft(self),
        () => graft(that),
        (winner, loser) => coordinate<E | E2, B, A, A2>(d.id, f, true, winner, loser),
        (winner, loser) => coordinate<E | E2, B, A2, A>(d.id, g, false, winner, loser)
      )
    )
  );
}

/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 *
 * @tsplus static ets/Effect/Aspects zipWithPar
 */
export const zipWithPar = Pipeable(zipWithPar_);

function coordinate<E, B, X, Y>(
  fiberId: FiberId,
  f: (a: X, b: Y) => B,
  leftWinner: boolean,
  winner: Fiber<E, X>,
  loser: Fiber<E, Y>
): Effect<unknown, E, B> {
  return winner.await().flatMap((winnerExit) =>
    winnerExit.fold(
      (winnerCause) =>
        loser.interruptAs(fiberId).flatMap((loserExit) =>
          loserExit.fold(
            (loserCause) =>
              leftWinner ? Effect.failCause(winnerCause & loserCause) : Effect.failCause(loserCause & winnerCause),
            () => Effect.failCause(winnerCause)
          )
        ),
      (a) =>
        loser.await().flatMap((loserExit) =>
          loserExit.fold<E, Y, Effect.IO<E, B>>(
            (loserCause) => Effect.failCause(loserCause),
            (b) => winner.inheritRefs() > loser.inheritRefs() > Effect.succeed(f(a, b))
          )
        )
    )
  );
}
