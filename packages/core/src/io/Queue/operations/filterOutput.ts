import type { Predicate } from "../../../data/Function"
import { Effect } from "../../Effect"
import type { XQueue } from "../definition"

/**
 * Filters elements dequeued from the queue using the specified predicate.
 *
 * @tsplus fluent ets/Queue filterOutput
 * @tsplus fluent ets/XQueue filterOutput
 * @tsplus fluent ets/Dequeue filterOutput
 * @tsplus fluent ets/XDequeue filterOutput
 * @tsplus fluent ets/Enqueue filterOutput
 * @tsplus fluent ets/XEnqueue filterOutput
 */
export function filterOutput_<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: Predicate<B>
): XQueue<RA, RB, EA, EB, A, B> {
  return self.filterOutputEffect((b) => Effect.succeedNow(f(b)))
}

/**
 * Filters elements dequeued from the queue using the specified predicate.
 *
 * @ets_data_first filterOutput_
 */
export function filterOutput<B>(f: Predicate<B>) {
  return <RA, RB, EA, EB, A>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): XQueue<RA, RB, EA, EB, A, B> => self.filterOutput(f)
}
