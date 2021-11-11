// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk"
import * as PipeThroughChannel from "../../_internal/api/pipeThroughChannel"
import type * as S from "../../_internal/core"
import type * as CH from "../../Channel"
import * as C from "../core"

/**
 * Creates a pipeline that sends all the elements through the given channel
 */
export function fromChannel<OutEnv0, InErr, OutErr0, In, Out>(
  channel: CH.Channel<
    OutEnv0,
    InErr,
    CK.Chunk<In>,
    unknown,
    OutErr0,
    CK.Chunk<Out>,
    any
  >
): C.Pipeline<C.$R & OutEnv0, C.$R, OutErr0, InErr, Out, In> {
  return C.make((stream: S.Stream<C.$R, InErr, In>) =>
    PipeThroughChannel.pipeThroughChannel_(stream, channel)
  )
}
