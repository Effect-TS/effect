import { Either } from "../../../data/Either"
import type { XFiberRef } from "../definition"

/**
 * Transforms both the `set` and `get` values of the `XFiberRef` with the
 * specified functions.
 *
 * @tsplus fluent ets/XFiberRef dimap
 * @tsplus fluent ets/XFiberRefRuntime dimap
 */
export function dimap_<EA, EB, A, B, C, D>(
  self: XFiberRef<EA, EB, A, B>,
  f: (c: C) => A,
  g: (b: B) => D
): XFiberRef<EA, EB, C, D> {
  return self.dimapEither(
    (c) => Either.right(f(c)),
    (b) => Either.right(g(b))
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
    self.dimap(f, g)
}
