// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk"
import { pipe } from "../../Function"
import type * as O from "../../Option"
import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { repeatEffectChunkOption } from "./repeatEffectChunkOption"

/**
 * Creates a stream from an effect producing values of type `A` until it fails with None.
 */
export const repeatEffectOption: <R, E, A>(
  fa: T.Effect<R, O.Option<E>, A>
) => Stream<R, E, A> = (x) => pipe(x, T.map(A.single), repeatEffectChunkOption)
