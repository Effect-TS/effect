// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as ChainPar from "./chainPar.js"
import * as FromEffect from "./fromEffect.js"

/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. The element order
 * is not enforced by this combinator, and elements may be reordered.
 */
export function mapEffectParUnordered_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  n: number,
  f: (a: A) => T.Effect<R1, E1, A1>
): C.Stream<R & R1, E | E1, A1> {
  return ChainPar.chainPar_(self, n, (a) => FromEffect.fromEffect(f(a)))
}

/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. The element order
 * is not enforced by this combinator, and elements may be reordered.
 *
 * @ets_data_first mapEffectParUnordered_
 */
export function mapEffectParUnordered<R1, E1, A, A1>(
  n: number,
  f: (a: A) => T.Effect<R1, E1, A1>
) {
  return <R, E>(self: C.Stream<R, E, A>) => mapEffectParUnordered_(self, n, f)
}
