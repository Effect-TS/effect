// ets_tracing: off

import * as T from "../../../Effect"
import type * as C from "./core"
import * as ForEachWhile from "./forEachWhile"

/**
 * A sink that executes the provided effectful function for every element fed to it.
 */
export function forEach<R, ErrIn, ErrOut, In, B>(
  f: (_in: In) => T.Effect<R, ErrOut, B>
): C.Sink<R, ErrIn, In, ErrIn | ErrOut, In, void> {
  return ForEachWhile.forEachWhile((_) => T.as_(f(_), true))
}
