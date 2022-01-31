// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as FromEffectOption from "./fromEffectOption.js"

/**
 * Creates a stream from an effect producing a value of type `A`
 */
export function fromEffect<R, E, A>(fa: T.Effect<R, E, A>): C.Stream<R, E, A> {
  return FromEffectOption.fromEffectOption(T.mapError_(fa, O.some))
}
