import { Effect } from "../../Effect"
import type { XQueue } from "../definition"

/**
 * Transforms elements enqueued into this queue with a pure function.
 *
 * @tsplus fluent ets/Queue contramap
 * @tsplus fluent ets/XQueue contramap
 * @tsplus fluent ets/Dequeue contramap
 * @tsplus fluent ets/XDequeue contramap
 * @tsplus fluent ets/Enqueue contramap
 * @tsplus fluent ets/XEnqueue contramap
 */
export function contramap_<RA, RB, EA, EB, B, C, A>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (c: C) => A
): XQueue<RA, RB, EA, EB, C, B> {
  return self.dimapEffect((c: C) => Effect.succeedNow(f(c)), Effect.succeedNow)
}

/**
 * Transforms elements enqueued into this queue with a pure function.
 *
 * @ets_data_first contramap_
 */
export function contramap<C, A>(f: (c: C) => A) {
  return <RA, RB, EA, EB, B>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): XQueue<RA, RB, EA, EB, C, B> => self.contramap(f)
}
