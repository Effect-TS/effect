// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../Function/index.js"
import type * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { repeatEffectChunkOption } from "./repeatEffectChunkOption.js"

/**
 * Creates a stream from an effect producing values of type `A` until it fails with None.
 */
export const repeatEffectOption: <R, E, A>(
  fa: T.Effect<R, O.Option<E>, A>
) => Stream<R, E, A> = (x) => pipe(x, T.map(A.single), repeatEffectChunkOption)
