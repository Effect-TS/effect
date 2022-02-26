import type { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"

/**
 * Performs the specified effect very time a value is read from this
 * `XRef.Synchronized`.
 *
 * @tsplus fluent ets/XSynchronized tapOutput
 */
export function tapOutput_<RA, RB, RC, EA, EB, EC, A, B, X>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: (b: B) => Effect<RC, EC, X>
): XSynchronized<RA, RB & RC, EA, EB | EC, A, B> {
  return self.mapEffect((a) => f(a).map(() => a))
}

/**
 * Performs the specified effect very time a value is read from this
 * `XRef.Synchronized`.
 *
 * @ets_data_first tapOutput_
 */
export function tapOutput<B, RC, EC, X>(f: (b: B) => Effect<RC, EC, X>) {
  return <RA, RB, EA, EB, A>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA, RB & RC, EA, EB | EC, A, B> => self.tapOutput(f)
}
