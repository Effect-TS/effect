/**
 * Returns an effect with the behavior of this one, but where all child fibers
 * forked in the effect are reported to the specified supervisor.
 *
 * @tsplus static effect/core/io/Effect.Aspects supervised
 * @tsplus pipeable effect/core/io/Effect supervised
 * @category mutations
 * @since 1.0.0
 */
export function supervised<X>(supervisor: Supervisor<X>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    self.apply(FiberRef.currentSupervisor.locallyWith((s) => s.zip(supervisor)))
}
