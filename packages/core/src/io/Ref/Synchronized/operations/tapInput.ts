import type { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"

/**
 * Performs the specified effect every time a value is written to this
 * `XRef.Synchronized`.
 *
 * @tsplus fluent ets/XSynchronized tapInput
 */
export function tapInput_<RA, RB, RC, EA, EB, EC, A, A1 extends A, B, X>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: (a1: A1) => Effect<RC, EC, X>
): XSynchronized<RA & RC, RB, EA | EC, EB, A1, B> {
  return self.contramapEffect((a) => f(a).map(() => a))
}

/**
 * Performs the specified effect every time a value is written to this
 * `XRef.Synchronized`.
 *
 * @ets_data_first tapInput_
 */
export function tapInput<A, A1 extends A, RC, EC, X>(f: (a1: A1) => Effect<RC, EC, X>) {
  return <RA, RB, EA, EB, B>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA & RC, RB, EA | EC, EB, A1, B> => self.tapInput(f)
}
