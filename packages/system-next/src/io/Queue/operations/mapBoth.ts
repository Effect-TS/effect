import { Effect } from "../../Effect"
import type { XQueue } from "../definition"

/**
 * Like `bothWithEffect`, but uses a pure function.
 *
 * @tsplus fluent ets/Queue bothWith
 * @tsplus fluent ets/XQueue bothWith
 * @tsplus fluent ets/Dequeue bothWith
 * @tsplus fluent ets/XDequeue bothWith
 * @tsplus fluent ets/Enqueue bothWith
 * @tsplus fluent ets/XEnqueue bothWith
 */
export function bothWith_<RA, RB, EA, EB, RA1, RB1, EA1, EB1, A1 extends A, C, B, D, A>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  that: XQueue<RA1, RB1, EA1, EB1, A1, C>,
  f: (b: B, c: C) => D
): XQueue<RA & RA1, RB & RB1, EA | EA1, EB | EB1, A1, D> {
  return self.bothWithEffect(that, (b, c) => Effect.succeedNow(f(b, c)))
}

/**
 * Like `bothWithEffect`, but uses a pure function.
 *
 * @ets_data_first bothWith_
 */
export function bothWith<RA1, RB1, EA1, EB1, A1 extends A, C, B, D, A>(
  that: XQueue<RA1, RB1, EA1, EB1, A1, C>,
  f: (b: B, c: C) => D
) {
  return <RA, RB, EA, EB>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): XQueue<RA & RA1, RB & RB1, EA | EA1, EB | EB1, A1, D> =>
    self.bothWithEffect(that, (b, c) => Effect.succeedNow(f(b, c)))
}
