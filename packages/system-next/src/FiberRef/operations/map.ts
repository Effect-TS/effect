import * as E from "../../Either"
import type { XFiberRef } from "../definition"
import { mapEither_ } from "./mapEither"

/**
 * Transforms the `get` value of the `XFiberRef` with the specified function.
 */
export function map_<EA, EB, A, B, C>(
  self: XFiberRef<EA, EB, A, B>,
  f: (b: B) => C
): XFiberRef<EA, EB, A, C> {
  return mapEither_(self, (b) => E.right(f(b)))
}

/**
 * Transforms the `get` value of the `XFiberRef` with the specified function.
 *
 * @ets_data_first map_
 */
export function map<B, C>(f: (b: B) => C) {
  return <EA, EB, A>(self: XFiberRef<EA, EB, A, B>): XFiberRef<EA, EB, A, C> =>
    map_(self, f)
}
