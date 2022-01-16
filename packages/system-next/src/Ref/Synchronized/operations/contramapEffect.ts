// ets_tracing: off

import type { XSynchronized } from "../definition"
import * as T from "./_internal/effect"
import { dimapEffect_ } from "./dimapEffect"

/**
 * Transforms the `set` value of the `XRef.Synchronized` with the specified
 * effectual function.
 */
export function contramapEffect_<RA, RB, RC, EA, EB, EC, A, B, C>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: (c: C) => T.Effect<RC, EC, A>
): XSynchronized<RA & RC, RB, EA | EC, EB, C, B> {
  return dimapEffect_(self, f, T.succeedNow)
}

/**
 * Transforms the `set` value of the `XRef.Synchronized` with the specified
 * effectual function.
 *
 * @ets_data_first contramapEffect_
 */
export function contramapEffect<RC, EC, A, C>(f: (c: C) => T.Effect<RC, EC, A>) {
  return <RA, RB, EA, EB, B>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA & RC, RB, EA | EC, EB, C, B> => contramapEffect_(self, f)
}
