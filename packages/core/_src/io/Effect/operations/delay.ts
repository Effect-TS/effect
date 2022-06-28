/**
 * Returns an effect that is delayed from this effect by the specified
 * `Duration`.
 *
 * @tsplus static effect/core/io/Effect.Aspects delay
 * @tsplus pipeable effect/core/io/Effect delay
 */
export function delay(duration: LazyArg<Duration>, __tsplusTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> => Clock.sleep(duration) > self
}
