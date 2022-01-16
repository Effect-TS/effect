// ets_tracing: off

import * as E from "../../Either"
import type { XFiberRef } from "../definition"
import { dimapEither_ } from "./dimapEither"

/**
 * Transforms both the `set` and `get` values of the `XFiberRef` with the
 * specified functions.
 */
export function dimap_<EA, EB, A, B, C, D>(
  self: XFiberRef<EA, EB, A, B>,
  f: (c: C) => A,
  g: (b: B) => D
): XFiberRef<EA, EB, C, D> {
  return dimapEither_(
    self,
    (c) => E.right(f(c)),
    (b) => E.right(g(b))
  )
}

/**
 * Transforms both the `set` and `get` values of the `XFiberRef` with the
 * specified functions.
 *
 * @ets_data_first dimap_
 */
export function dimap<A, B, C, D>(f: (c: C) => A, g: (b: B) => D) {
  return <EA, EB>(self: XFiberRef<EA, EB, A, B>): XFiberRef<EA, EB, C, D> =>
    dimap_(self, f, g)
}
