// ets_tracing: off

import type { XSynchronized } from "../definition"
import * as T from "./_internal/effect"
import { dimapEffect_ } from "./dimapEffect"

/**
 * Transforms the `get` value of the `ZRef.Synchronized` with the specified
 * effectual function.
 */
export function mapEffect_<RA, RB, RC, EA, EB, EC, A, B, C>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: (b: B) => T.Effect<RC, EC, C>
): XSynchronized<RA, RB & RC, EA, EB | EC, A, C> {
  return dimapEffect_(self, T.succeedNow, f)
}

/**
 * Transforms the `get` value of the `ZRef.Synchronized` with the specified
 * effectual function.
 *
 * @ets_data_first mapEffect_
 */
export function mapEffect<RC, EC, B, C>(f: (b: B) => T.Effect<RC, EC, C>) {
  return <RA, RB, EA, EB, A>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA, RB & RC, EA, EB | EC, A, C> => mapEffect_(self, f)
}
