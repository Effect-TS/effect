// ets_tracing: off

import * as T from "../../../../Effect"
import * as O from "../../../../Option"
import type * as C from "../core.js"
import * as RepeatEffectOption from "./repeatEffectOption.js"

/**
 * Creates a stream from an effect producing a value of type `A` which repeats forever.
 */
export function repeatEffect<R, E, A>(fa: T.Effect<R, E, A>): C.Stream<R, E, A> {
  return RepeatEffectOption.repeatEffectOption(T.mapError_(fa, O.some))
}
