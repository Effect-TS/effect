import { Effect } from "../../Effect"
import type { XQueue } from "../definition"

/**
 * Transforms elements dequeued from this queue with an effectful function.
 *
 * @tsplus fluent ets/Queue mapEffect
 * @tsplus fluent ets/XQueue mapEffect
 * @tsplus fluent ets/Dequeue mapEffect
 * @tsplus fluent ets/XDequeue mapEffect
 * @tsplus fluent ets/Enqueue mapEffect
 * @tsplus fluent ets/XEnqueue mapEffect
 */
export function mapEffect_<RA, RB, EA, EB, A, B, R2, E2, C>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (b: B) => Effect<R2, E2, C>
): XQueue<RA, R2 & RB, EA, EB | E2, A, C> {
  return self.dimapEffect((a: A) => Effect.succeedNow(a), f)
}

/**
 * Transforms elements dequeued from this queue with an effectful function.
 *
 * @ets_data_first mapEffect_
 */
export function mapEffect<B, R2, E2, C>(f: (b: B) => Effect<R2, E2, C>) {
  return <RA, RB, EA, EB, A>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): XQueue<RA, R2 & RB, EA, EB | E2, A, C> => self.mapEffect(f)
}
