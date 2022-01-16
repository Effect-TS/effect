// ets_tracing: off

import type { XSynchronized } from "../definition"
import { foldEffect_ } from "../definition"
import type * as T from "./_internal/effect"

/**
 * Transforms both the `set` and `get` values of the `XRef.Synchronized`
 * with the specified effectual functions.
 */
export function dimapEffect_<RA, RB, RC, RD, EA, EB, EC, ED, A, B, C, D>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: (c: C) => T.Effect<RC, EC, A>,
  g: (b: B) => T.Effect<RD, ED, D>
): XSynchronized<RA & RC, RB & RD, EA | EC, EB | ED, C, D> {
  return foldEffect_(
    self,
    (_: EA | EC) => _,
    (_: EB | ED) => _,
    f,
    g
  )
}

/**
 * Transforms both the `set` and `get` values of the `XRef.Synchronized`
 * with the specified effectual functions.
 *
 * @ets_data_first dimapEffect_
 */
export function dimapEffect<RC, RD, EC, ED, A, B, C, D>(
  f: (c: C) => T.Effect<RC, EC, A>,
  g: (b: B) => T.Effect<RD, ED, D>
) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA & RC, RB & RD, EA | EC, EB | ED, C, D> => dimapEffect_(self, f, g)
}
