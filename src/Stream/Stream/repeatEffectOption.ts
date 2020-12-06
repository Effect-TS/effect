import * as A from "../../Chunk"
import { flow } from "../../Function"
import type * as O from "../../Option"
import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { repeatEffectChunkOption } from "./repeatEffectChunkOption"

/**
 * Creates a stream from an effect producing values of type `A` until it fails with None.
 */
export const repeatEffectOption: <R, E, A>(
  fa: T.Effect<R, O.Option<E>, A>
) => Stream<R, E, A> = flow(T.map(A.single), repeatEffectChunkOption)
