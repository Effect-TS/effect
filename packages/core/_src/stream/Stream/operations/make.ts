/**
 * Creates a pure stream from a variable list of values
 *
 * @tsplus static effect/core/stream/Stream.Ops __call
 */
export function make<A>(...as: Array<A>): Stream<never, never, A> {
  return Stream.fromCollection(as)
}
