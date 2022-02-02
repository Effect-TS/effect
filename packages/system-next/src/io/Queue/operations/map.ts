import { Effect } from "../../Effect"
import type { XQueue } from "../definition"

/**
 * Transforms elements dequeued from this queue with a function.
 *
 * @tsplus fluent ets/Queue map
 * @tsplus fluent ets/XQueue map
 * @tsplus fluent ets/Dequeue map
 * @tsplus fluent ets/XDequeue map
 * @tsplus fluent ets/Enqueue map
 * @tsplus fluent ets/XEnqueue map
 */
export function map_<RA, RB, EA, EB, A, B, C>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (b: B) => C
): XQueue<RA, RB, EA, EB, A, C> {
  return self.mapEffect((b) => Effect.succeedNow(f(b)))
}

/**
 * Transforms elements dequeued from this queue with a function.
 *
 * @ets_data_first map_
 */
export function map<RA, RB, EA, EB, A, B, C>(f: (b: B) => C) {
  return (self: XQueue<RA, RB, EA, EB, A, B>): XQueue<RA, RB, EA, EB, A, C> =>
    self.map(f)
}
