/**
 * Constructs a generator from a function that uses randomness. The returned
 * generator will not have any shrinking.
 *
 * @tsplus static effect/core/testing/Gen.Ops fromRandom
 * @category constructors
 * @since 1.0.0
 */
export function fromRandom<A>(f: (random: Random) => Effect<never, never, A>): Gen<never, A> {
  return Gen.fromRandomSample((random) => f(random).map(Sample.noShrink))
}
