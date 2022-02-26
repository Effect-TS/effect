import type { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"

/**
 * Transforms both the `set` and `get` values of the `XRef.Synchronized`
 * with the specified effectual functions.
 *
 * @tsplus fluent ets/XSynchronized dimapEffect
 */
export function dimapEffect_<RA, RB, RC, RD, EA, EB, EC, ED, A, B, C, D>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: (c: C) => Effect<RC, EC, A>,
  g: (b: B) => Effect<RD, ED, D>
): XSynchronized<RA & RC, RB & RD, EA | EC, EB | ED, C, D> {
  return self.foldEffect(
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
  f: (c: C) => Effect<RC, EC, A>,
  g: (b: B) => Effect<RD, ED, D>
) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA & RC, RB & RD, EA | EC, EB | ED, C, D> => self.dimapEffect(f, g)
}
