// ets_tracing: off

import { identity } from "../../../../Function/index.js"
import type * as C from "../core.js"
import * as ZipAllWith from "./zipAllWith.js"

/**
 * Zips this stream with another point-wise, and keeps only elements from the other stream.
 *
 * The provided default value will be used if this stream ends before the other one.
 */
export function zipAllLeft_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  that: C.Stream<R1, E1, A1>,
  default_: A
): C.Stream<R & R1, E | E1, A> {
  return ZipAllWith.zipAllWith_(
    self,
    that,
    identity,
    (_) => default_,
    (o, _) => o
  )
}

/**
 * Zips this stream with another point-wise, and keeps only elements from the other stream.
 *
 * The provided default value will be used if this stream ends before the other one.
 *
 * @ets_data_first zipAllLeft_
 */
export function zipAllLeft<R1, E1, A, A1>(that: C.Stream<R1, E1, A1>, default_: A) {
  return <R, E>(self: C.Stream<R, E, A>) => zipAllLeft_(self, that, default_)
}
