import type { Option } from "@fp-ts/data/Option"

/**
 * Returns the resulting stream when the given partial function is defined
 * for the given effectful value, otherwise returns an empty stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops whenCaseEffect
 * @category mutations
 * @since 1.0.0
 */
export function whenCaseEffect<R, E, A, R1, E1, A1>(
  a: Effect<R, E, A>,
  pf: (a: A) => Option<Stream<R1, E1, A1>>
): Stream<R | R1, E | E1, A1> {
  return Stream.fromEffect(a).flatMap((a) => {
    const option = pf(a)
    switch (option._tag) {
      case "None": {
        return Stream.empty
      }
      case "Some": {
        return option.value
      }
    }
  })
}
