/**
 * @tsplus static ets/Random/Ops withSeed
 */
export function withSeed(seed: number) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & HasRandom, E, A> =>
    self.updateService(HasRandom)(() => Random.live(seed));
}
