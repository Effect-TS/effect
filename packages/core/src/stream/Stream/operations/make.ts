/**
 * Creates a pure stream from a variable list of values
 *
 * @tsplus static effect/core/stream/Stream.Ops __call
 * @category constructors
 * @since 1.0.0
 */
export function make<A>(...as: Array<A>): Stream<never, never, A> {
  return Stream.fromIterable(as)
}
