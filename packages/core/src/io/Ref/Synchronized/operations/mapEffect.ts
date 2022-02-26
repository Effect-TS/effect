import { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"

/**
 * Transforms the `get` value of the `ZRef.Synchronized` with the specified
 * effectual function.
 *
 * @tsplus fluent ets/XSynchronized mapEffect
 */
export function mapEffect_<RA, RB, RC, EA, EB, EC, A, B, C>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: (b: B) => Effect<RC, EC, C>
): XSynchronized<RA, RB & RC, EA, EB | EC, A, C> {
  return self.dimapEffect(Effect.succeedNow, f)
}

/**
 * Transforms the `get` value of the `ZRef.Synchronized` with the specified
 * effectual function.
 *
 * @ets_data_first mapEffect_
 */
export function mapEffect<RC, EC, B, C>(f: (b: B) => Effect<RC, EC, C>) {
  return <RA, RB, EA, EB, A>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA, RB & RC, EA, EB | EC, A, C> => self.mapEffect(f)
}
