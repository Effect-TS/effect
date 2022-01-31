// ets_tracing: off

import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { fromEffectOption } from "./fromEffectOption.js"

/**
 * Creates a stream from an effect producing a value of type `A`
 */
export function fromEffect<R, E, A>(fa: T.Effect<R, E, A>): Stream<R, E, A> {
  return pipe(fa, T.mapError(O.some), fromEffectOption)
}
