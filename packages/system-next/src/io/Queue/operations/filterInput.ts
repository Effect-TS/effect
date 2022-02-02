import type { Predicate } from "../../../data/Function"
import { Effect } from "../../Effect"
import type { XQueue } from "../definition"

/**
 * Applies a filter to elements enqueued into this queue. Elements that do not
 * pass the filter will be immediately dropped.
 *
 * @tsplus fluent ets/Queue filterInput
 * @tsplus fluent ets/XQueue filterInput
 * @tsplus fluent ets/Dequeue filterInput
 * @tsplus fluent ets/XDequeue filterInput
 * @tsplus fluent ets/Enqueue filterInput
 * @tsplus fluent ets/XEnqueue filterInput
 */
export function filterInput_<RA, RB, EA, EB, B, A, A1 extends A>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: Predicate<A1>
): XQueue<RA, RB, EA, EB, A1, B> {
  return self.filterInputEffect((a) => Effect.succeedNow(f(a)))
}

/**
 * Applies a filter to elements enqueued into this queue. Elements that do not
 * pass the filter will be immediately dropped.
 *
 * @ets_data_first filterInput_
 */
export function filterInput<A, A1 extends A>(f: Predicate<A1>) {
  return <RA, RB, EA, EB, B>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): XQueue<RA, RB, EA, EB, A1, B> => self.filterInput(f)
}
