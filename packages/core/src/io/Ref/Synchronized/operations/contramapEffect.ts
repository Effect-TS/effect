import { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"

/**
 * Transforms the `set` value of the `XRef.Synchronized` with the specified
 * effectual function.
 *
 * @tsplus fluent ets/XSynchronized contramapEffect
 */
export function contramapEffect_<RA, RB, RC, EA, EB, EC, A, B, C>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: (c: C) => Effect<RC, EC, A>
): XSynchronized<RA & RC, RB, EA | EC, EB, C, B> {
  return self.dimapEffect(f, Effect.succeedNow)
}

/**
 * Transforms the `set` value of the `XRef.Synchronized` with the specified
 * effectual function.
 *
 * @ets_data_first contramapEffect_
 */
export function contramapEffect<RC, EC, A, C>(f: (c: C) => Effect<RC, EC, A>) {
  return <RA, RB, EA, EB, B>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA & RC, RB, EA | EC, EB, C, B> => self.contramapEffect(f)
}
