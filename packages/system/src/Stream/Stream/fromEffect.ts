// ets_tracing: off

import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { fromEffectOption } from "./fromEffectOption"

/**
 * Creates a stream from an effect producing a value of type `A`
 */
export function fromEffect<R, E, A>(fa: T.Effect<R, E, A>): Stream<R, E, A> {
  return pipe(fa, T.mapError(O.some), fromEffectOption)
}
