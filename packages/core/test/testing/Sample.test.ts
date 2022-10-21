function equalEffects<A, B>(
  left: Effect<never, never, Sample<never, A>>,
  right: Effect<never, never, Sample<never, B>>
): Effect<never, never, boolean> {
  return left.flatMap((a) => right.flatMap((b) => equalSamples(a, b)))
}

function equalSamples<A, B>(
  left: Sample<never, A>,
  right: Sample<never, B>
): Effect<never, never, boolean> {
  return !Equals.equals(left.value, right.value) ?
    Effect.sync(false) :
    equalShrinks(left.shrink, right.shrink)
}

function equalShrinks<A, B>(
  left: Stream<never, never, Maybe<Sample<never, A>>>,
  right: Stream<never, never, Maybe<Sample<never, B>>>
): Effect<never, never, boolean> {
  return left.zip(right).mapEffect(([left, right]) => {
    if (left.isSome() && right.isSome()) {
      return equalSamples(left.value, right.value)
    }
    if (left.isNone() && right.isNone()) {
      return Effect.succeed(true)
    }
    return Effect.succeed(false)
  }).runFold(true, (a, b) => a && b)
}

describe.concurrent("Sample", () => {
  it("monad left identity", () =>
    Do(($) => {
      const sample = Sample.shrinkIntegral(0)(5)
      const result = $(equalSamples(sample.flatMap(Sample.noShrink), sample))
      assert.isTrue(result)
    }).unsafeRunPromise(), 30_000)

  it("monad right identity", () =>
    Do(($) => {
      const n = 5
      const f = (n: number): Sample<never, number> => Sample.shrinkIntegral(0)(n)
      const result = $(equalSamples(Sample.noShrink(n).flatMap(f), f(n)))
      assert.isTrue(result)
    }).unsafeRunPromise(), 30_000)

  it("monad associativity", () =>
    Do(($) => {
      const sample = Sample.shrinkIntegral(0)(2)
      const f = (n: number): Sample<never, number> => Sample.shrinkIntegral(0)(n + 3)
      const g = (n: number): Sample<never, number> => Sample.shrinkIntegral(0)(n + 5)
      const result = $(equalSamples(
        sample.flatMap(f).flatMap(g),
        sample.flatMap((a) => f(a).flatMap(g))
      ))
      assert.isTrue(result)
    }).unsafeRunPromise(), 30_000)

  it("traverse fusion", () =>
    Do(($) => {
      const sample = Sample.shrinkIntegral(0)(5)
      const f = (n: number): Effect<never, never, number> => Effect.sync(n + 2)
      const g = (n: number): Effect<never, never, number> => Effect.sync(n * 3)
      const result = $(equalEffects(
        sample.forEach((a) => f(a).flatMap(g)),
        sample.forEach(f).flatMap((sample) => sample.forEach(g))
      ))
      assert.isTrue(result)
    }).unsafeRunPromise(), 30_000)
})
