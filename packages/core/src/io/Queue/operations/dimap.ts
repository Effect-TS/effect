import { Effect } from "../../Effect"
import type { XQueue } from "../definition"

/**
 * Transforms elements enqueued into and dequeued from this queue with the
 * specified pure functions.
 *
 * @tsplus fluent ets/Queue dimap
 * @tsplus fluent ets/XQueue dimap
 * @tsplus fluent ets/Dequeue dimap
 * @tsplus fluent ets/XDequeue dimap
 * @tsplus fluent ets/Enqueue dimap
 * @tsplus fluent ets/XEnqueue dimap
 */
export function dimap_<RA, RB, EA, EB, A, B, C, D>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (c: C) => A,
  g: (b: B) => D
): XQueue<RA, RB, EA, EB, C, D> {
  return self.dimapEffect(
    (c: C) => Effect.succeedNow(f(c)),
    (b) => Effect.succeedNow(g(b))
  )
}

/**
 * Transforms elements enqueued into and dequeued from this queue with the
 * specified pure functions.
 *
 * @ets_data_first dimap_
 */
export function dimap<A, B, C, D>(f: (c: C) => A, g: (b: B) => D) {
  return <RA, RB, EA, EB>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): XQueue<RA, RB, EA, EB, C, D> => self.dimap(f, g)
}
