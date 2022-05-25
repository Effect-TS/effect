/**
 * Returns an effect that races this effect with the specified effect,
 * returning the first successful `A` from the faster side. If one effect
 * succeeds, the other will be interrupted. If neither succeeds, then the
 * effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated. If early return is
 * desired, then instead of performing `l race r`, perform `l.disconnect race
 * r.disconnect`, which disconnects left and right interruption signals,
 * allowing a fast return, with interruption performed in the background.
 *
 * Note that if the `race` is embedded into an uninterruptible region, then
 * because the loser cannot be interrupted, it will be allowed to continue
 * executing in the background, without delaying the return of the race.
 *
 * @tsplus fluent ets/Effect race
 */
export function race_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, A | A2> {
  return Effect.descriptorWith((descriptor) => {
    const parentFiberId = descriptor.id
    function maybeDisconnect<R, E, A>(io: LazyArg<Effect<R, E, A>>) {
      return Effect.uninterruptibleMask(({ force }) => force(io))
    }

    return maybeDisconnect(self).raceWith(
      maybeDisconnect(that),
      (exit, right) =>
        exit.foldEffect(
          (cause) => right.join().mapErrorCause((_) => cause & _),
          (a) => right.interruptAs(parentFiberId).as(a)
        ),
      (exit, left) =>
        exit.foldEffect(
          (cause) => left.join().mapErrorCause((_) => _ & cause),
          (a) => left.interruptAs(parentFiberId).as(a)
        )
    )
  })
}

/**
 * Returns an effect that races this effect with the specified effect,
 * returning the first successful `A` from the faster side. If one effect
 * succeeds, the other will be interrupted. If neither succeeds, then the
 * effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated. If early return is
 * desired, then instead of performing `l race r`, perform `l.disconnect race
 * r.disconnect`, which disconnects left and right interruption signals,
 * allowing a fast return, with interruption performed in the background.
 *
 * Note that if the `race` is embedded into an uninterruptible region, then
 * because the loser cannot be interrupted, it will be allowed to continue
 * executing in the background, without delaying the return of the race.
 *
 * @tsplus static ets/Effect/Aspects race
 */
export const race = Pipeable(race_)

/**
 * Returns an effect that races this effect with the specified effect,
 * yielding the first result to succeed. If neither effect succeeds, then the
 * composed effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 *
 * @tsplus fluent ets/Effect raceEither
 */
export function raceEither_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, Either<A, A2>> {
  return self.map(Either.left).race(that().map(Either.right))
}

/**
 * Returns an effect that races this effect with the specified effect,
 * yielding the first result to succeed. If neither effect succeeds, then the
 * composed effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 *
 * @tsplus static ets/Effect/Aspects raceEither
 */
export const raceEither = Pipeable(raceEither_)

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
 * @tsplus fluent ets/Effect raceFirst
 */
export function raceFirst_<R, R2, E, E2, A, A2>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Effect<R & R2, E2 | E, A2 | A> {
  return self
    .exit()
    .race(that().exit())
    .flatMap((a) => Effect.done(a as Exit<E | E2, A | A2>))
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
 * @tsplus static ets/Effect/Aspects raceFirst
 */
export const raceFirst = Pipeable(raceFirst_)
