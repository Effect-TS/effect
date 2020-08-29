import * as T from "../_internal/effect"
import { pipe } from "../../Function"
import * as O from "../../Option"
import type { Stream } from "./definitions"
import { fromEffectOption } from "./fromEffectOption"

/**
 * Creates a stream from an effect producing a value of type `A`
 */
export const fromEffect = <S, R, E, A>(fa: T.Effect<S, R, E, A>): Stream<S, R, E, A> =>
  pipe(fa, T.mapError(O.some), fromEffectOption)
