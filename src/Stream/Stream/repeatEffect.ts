import * as O from "../../Option"
import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { repeatEffectOption } from "./repeatEffectOption"

/**
 * Creates a stream from an effect producing a value of type `A` which repeats forever.
 */
export function repeatEffect<R, E, A>(fa: T.Effect<R, E, A>): Stream<R, E, A> {
  return repeatEffectOption(T.mapError_(fa, O.some))
}
