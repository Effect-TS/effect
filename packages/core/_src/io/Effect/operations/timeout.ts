/**
 * Returns an effect that will timeout this effect, returning `None` if the
 * timeout elapses before the effect has produced a value; and returning
 * `Some` of the produced value otherwise.
 *
 * If the timeout elapses without producing a value, the running effect will
 * be safely interrupted.
 *
 * WARNING: The effect returned by this method will not itself return until
 * the underlying effect is actually interrupted. This leads to more
 * predictable resource utilization. If early return is desired, then instead
 * of using `effect.timeout(d)`, use `effect.disconnect.timeout(d)`, which
 * first disconnects the effect's interruption signal before performing the
 * timeout, resulting in earliest possible return, before an underlying effect
 * has been successfully interrupted.
 *
 * @tsplus static effect/core/io/Effect.Aspects timeout
 * @tsplus pipeable effect/core/io/Effect timeout
 */
export function timeout(duration: LazyArg<Duration>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, Maybe<A>> =>
    self.timeoutTo(Maybe.none, Maybe.some, duration)
}
