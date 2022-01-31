// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk"
import type * as T from "../../../../Effect"
import * as M from "../../../../Managed"
import type * as O from "../../../../Option"
import type * as C from "../core.js"
import * as RepeatEffectChunkOption from "./repeatEffectChunkOption.js"
import * as UnwrapManaged from "./unwrapManaged.js"

export function fromPull<R, E, A>(
  io: M.RIO<R, T.Effect<R, O.Option<E>, CK.Chunk<A>>>
): C.Stream<R, E, A> {
  return UnwrapManaged.unwrapManaged(
    M.map_(io, (pull) => RepeatEffectChunkOption.repeatEffectChunkOption(pull))
  )
}
