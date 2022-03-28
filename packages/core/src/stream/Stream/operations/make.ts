import { Stream } from "../definition"

/**
 * Creates a pure stream from a variable list of values
 *
 * @tsplus static ets/StreamOps __call
 */
export function make<A>(...as: Array<A>): Stream<unknown, never, A> {
  return Stream.fromIterable(as)
}
