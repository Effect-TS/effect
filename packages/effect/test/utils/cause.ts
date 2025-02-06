import * as Cause from "effect/Cause"
import * as fc from "effect/FastCheck"
import * as FiberId from "effect/FiberId"

export const causesArb = <E>(
  n: number,
  error: fc.Arbitrary<E>,
  defect: fc.Arbitrary<unknown>
): fc.Arbitrary<Cause.Cause<E>> => {
  const fiberId: fc.Arbitrary<FiberId.FiberId> = fc.tuple(
    fc.integer(),
    fc.integer()
  ).map(([a, b]) => FiberId.make(a, b))

  const empty = fc.constant(Cause.empty)
  const failure = error.map(Cause.fail)
  const die = defect.map(Cause.die)
  const interrupt = fiberId.map(Cause.interrupt)

  const sequential = (n: number): fc.Arbitrary<Cause.Cause<E>> => {
    return fc.integer({ min: 1, max: n - 1 }).chain((i) =>
      causesN(i).chain((left) => causesN(n - i).map((right) => Cause.sequential(left, right)))
    )
  }

  const parallel = (n: number): fc.Arbitrary<Cause.Cause<E>> => {
    return fc.integer({ min: 1, max: n - 1 }).chain((i) =>
      causesN(i).chain((left) => causesN(n - i).map((right) => Cause.parallel(left, right)))
    )
  }

  const causesN = (n: number): fc.Arbitrary<Cause.Cause<E>> => {
    if (n === 1) {
      return fc.oneof(empty, failure, die, interrupt)
    }
    return fc.oneof(sequential(n), parallel(n))
  }

  return causesN(n)
}

export const causes: fc.Arbitrary<Cause.Cause<string>> = causesArb(
  1,
  fc.string(),
  fc.string().map((message) => new Error(message))
)

export const errors: fc.Arbitrary<string> = fc.string()

export const errorCauseFunctions: fc.Arbitrary<(s: string) => Cause.Cause<string>> = fc.func(causes)

export const equalCauses: fc.Arbitrary<
  readonly [Cause.Cause<string>, Cause.Cause<string>]
> = fc.tuple(causes, causes, causes)
  .chain(([a, b, c]) => {
    const causeCases: ReadonlyArray<readonly [Cause.Cause<string>, Cause.Cause<string>]> = [
      [a, a],
      [
        Cause.sequential(Cause.sequential(a, b), c),
        Cause.sequential(a, Cause.sequential(b, c))
      ],
      [
        Cause.sequential(a, Cause.parallel(b, c)),
        Cause.parallel(Cause.sequential(a, b), Cause.sequential(a, c))
      ],
      [
        Cause.parallel(Cause.parallel(a, b), c),
        Cause.parallel(a, Cause.parallel(b, c))
      ],
      [
        Cause.parallel(Cause.sequential(a, c), Cause.sequential(b, c)),
        Cause.sequential(Cause.parallel(a, b), c)
      ],
      [
        Cause.parallel(a, b),
        Cause.parallel(b, a)
      ],
      [a, Cause.sequential(a, Cause.empty)],
      [a, Cause.parallel(a, Cause.empty)]
    ]
    return fc.integer({ min: 0, max: causeCases.length - 1 }).map((i) => causeCases[i])
  })
