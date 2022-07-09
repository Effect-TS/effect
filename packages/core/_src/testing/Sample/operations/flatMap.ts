import { mergeStream } from "@effect/core/testing/_internal/mergeStream"

/**
 * @tsplus static effect/core/testing/Sample.Aspects flatMap
 * @tsplus pipeable effect/core/testing/Sample flatMap
 */
export function flatMap<A, R2, A2>(f: (a: A) => Sample<R2, A2>) {
  return <R>(self: Sample<R, A>): Sample<R | R2, A2> => {
    const sample = f(self.value)
    return Sample(
      sample.value,
      mergeStream(
        sample.shrink as Stream<R | R2, never, Maybe<Sample<R | R2, A2>>>,
        self.shrink.map((maybe) => maybe.map((sample) => sample.flatMap(f)))
      )
    )
  }
}
