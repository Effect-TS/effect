import { Tuple } from "../../../collection/immutable/Tuple"
import type { XQueue } from "../definition"

/**
 * Like `bothWith`, but tuples the elements instead of applying a function.
 *
 * @tsplus fluent ets/Queue both
 * @tsplus fluent ets/XQueue both
 * @tsplus fluent ets/Dequeue both
 * @tsplus fluent ets/XDequeue both
 * @tsplus fluent ets/Enqueue both
 * @tsplus fluent ets/XEnqueue both
 */
export function both_<RA, RB, EA, EB, RA1, RB1, EA1, EB1, A1 extends A, C, B, A>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  that: XQueue<RA1, RB1, EA1, EB1, A1, C>
): XQueue<RA & RA1, RB & RB1, EA | EA1, EB | EB1, A1, Tuple<[B, C]>> {
  return self.bothWith(that, (b, c) => Tuple(b, c))
}

/**
 * Like `bothWith`, but tuples the elements instead of applying a function.
 *
 * @ets_data_first both_
 */
export function both<RA1, RB1, EA1, EB1, A1 extends A, C, B, A>(
  that: XQueue<RA1, RB1, EA1, EB1, A1, C>
) {
  return <RA, RB, EA, EB>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): XQueue<RA & RA1, RB & RB1, EA | EA1, EB | EB1, A1, Tuple<[B, C]>> =>
    self.bothWith(that, (b, c) => Tuple(b, c))
}
