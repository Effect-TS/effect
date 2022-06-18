/**
 * Returns the resulting stream when the given partial function is defined
 * for the given value, otherwise returns an empty stream.
 *
 * @tsplus static ets/Stream/Ops whenCase
 */
export function whenCase<R, E, A, A1>(
  a: LazyArg<A>,
  pf: (a: A) => Maybe<Stream<R, E, A1>>,
  __tsplusTrace?: string
): Stream<R, E, A1> {
  return Stream.whenCaseEffect(Effect.succeed(a), pf)
}
