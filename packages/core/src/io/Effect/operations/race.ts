import * as Either from "@fp-ts/data/Either"

/**
 * Returns an effect that races this effect with the specified effect,
 * returning the first successful `A` from the faster side. If one effect
 * succeeds, the other will be interrupted. If neither succeeds, then the
 * effect will fail with some error.
 *
 * Note that both effects are disconnected before being raced. This means that
 * interruption of the loser will always be performed in the background. If this
 * behavior is not desired, you can use `Effect.raceWith`, which will not
 * disconnect or interrupt losers.
 *
 * @tsplus static effect/core/io/Effect.Aspects race
 * @tsplus pipeable effect/core/io/Effect race
 * @category mutations
 * @since 1.0.0
 */
export function race<R2, E2, A2>(that: Effect<R2, E2, A2>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A | A2> =>
    self.disconnect.raceAwait(that.disconnect)
}

/**
 * Returns an effect that races this effect with the specified effect,
 * returning the first successful `A` from the faster side. If one effect
 * succeeds, the other will be interrupted. If neither succeeds, then the
 * effect will fail with some error.
 *
 * @tsplus static effect/core/io/Effect.Aspects raceAwait
 * @tsplus pipeable effect/core/io/Effect raceAwait
 * @category mutations
 * @since 1.0.0
 */
export function raceAwait<R2, E2, A2>(that: Effect<R2, E2, A2>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A | A2> =>
    Effect.withFiberRuntime((state) =>
      self.raceWith(
        that,
        (exit, right) =>
          exit.foldEffect(
            (cause) => right.join.mapErrorCause((_) => cause & _),
            (a) => right.interruptAs(state.id).as(a)
          ),
        (exit, left) =>
          exit.foldEffect(
            (cause) => left.join.mapErrorCause((_) => _ & cause),
            (a) => left.interruptAs(state.id).as(a)
          )
      )
    )
}

/**
 * Returns an effect that races this effect with the specified effect,
 * yielding the first result to succeed. If neither effect succeeds, then the
 * composed effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 *
 * @tsplus static effect/core/io/Effect.Aspects raceEither
 * @tsplus pipeable effect/core/io/Effect raceEither
 * @category mutations
 * @since 1.0.0
 */
export function raceEither<R2, E2, A2>(that: Effect<R2, E2, A2>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, Either.Either<A, A2>> =>
    self.map(Either.left).race(that.map(Either.right))
}

/**
 * Returns an effect that races this effect with the specified effect,
 * yielding the first result to complete, whether by success or failure. If
 * neither effect completes, then the composed effect will not complete.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated. If early return is
 * desired, then instead of performing `l raceFirst r`, perform
 * `l.disconnect raceFirst r.disconnect`, which disconnects left and right
 * interrupt signal, allowing a fast return, with interruption performed
 * in the background.
 *
 * @tsplus static effect/core/io/Effect.Aspects raceFirst
 * @tsplus pipeable effect/core/io/Effect raceFirst
 * @category mutations
 * @since 1.0.0
 */
export function raceFirst<R2, E2, A2>(that: Effect<R2, E2, A2>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E2 | E, A2 | A> =>
    self.exit.race(that.exit).flatten
}
