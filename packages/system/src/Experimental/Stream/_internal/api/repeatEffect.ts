// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as RepeatEffectOption from "./repeatEffectOption.js"

/**
 * Creates a stream from an effect producing a value of type `A` which repeats forever.
 */
export function repeatEffect<R, E, A>(fa: T.Effect<R, E, A>): C.Stream<R, E, A> {
  return RepeatEffectOption.repeatEffectOption(T.mapError_(fa, O.some))
}
