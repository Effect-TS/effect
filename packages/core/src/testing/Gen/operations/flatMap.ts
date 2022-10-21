import { flatMapStream } from "@effect/core/testing/_internal/flatMapStream"

/**
 * @tsplus static effect/core/testing/Gen.Aspects flatMap
 * @tsplus pipeable effect/core/testing/Gen flatMap
 */
export function flatMap<A, R2, A2>(f: (a: A) => Gen<R2, A2>) {
  return <R>(self: Gen<R, A>): Gen<R | R2, A2> =>
    Gen(
      flatMapStream(self.sample, (sample) => {
        const values = f(sample.value).sample
        const shrinks = Gen(sample.shrink).flatMap(f).sample
        return values.map((maybe) =>
          maybe.map((sample) =>
            sample.flatMap(
              (a2) => Sample(a2, shrinks)
            )
          )
        )
      })
    )
}
