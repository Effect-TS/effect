import { Effect } from "../../Effect"
import type { XQueue } from "../definition"

/**
 * Transforms elements enqueued into this queue with an effectful function.
 *
 * @tsplus fluent ets/Queue contramapEffect
 * @tsplus fluent ets/XQueue contramapEffect
 * @tsplus fluent ets/Dequeue contramapEffect
 * @tsplus fluent ets/XDequeue contramapEffect
 * @tsplus fluent ets/Enqueue contramapEffect
 * @tsplus fluent ets/XEnqueue contramapEffect
 */
export function contramapEffect_<RA, RB, EA, EB, B, C, RA2, EA2, A>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  f: (c: C) => Effect<RA2, EA2, A>
): XQueue<RA & RA2, RB, EA | EA2, EB, C, B> {
  return self.dimapEffect(f, Effect.succeedNow)
}

/**
 * Transforms elements enqueued into this queue with an effectful function.
 *
 * @ets_data_first contramapEffect_
 */
export function contramapEffect<C, RA2, EA2, A>(f: (c: C) => Effect<RA2, EA2, A>) {
  return <RA, RB, EA, EB, B>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): XQueue<RA & RA2, RB, EA | EA2, EB, C, B> => self.contramapEffect(f)
}
