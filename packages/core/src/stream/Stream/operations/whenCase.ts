import type { Option } from "@fp-ts/data/Option"

/**
 * Returns the resulting stream when the given partial function is defined
 * for the given value, otherwise returns an empty stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops whenCase
 * @category mutations
 * @since 1.0.0
 */
export function whenCase<R, E, A, A1>(
  a: LazyArg<A>,
  pf: (a: A) => Option<Stream<R, E, A1>>
): Stream<R, E, A1> {
  return Stream.whenCaseEffect(Effect.sync(a), pf)
}
