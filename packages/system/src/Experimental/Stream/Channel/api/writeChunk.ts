// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as C from "../core.js"
import * as Unit from "./unit.js"
import * as ZipRight from "./zipRight.js"

export function writeChunk<Out>(
  outs: CK.Chunk<Out>
): C.Channel<unknown, unknown, unknown, unknown, never, Out, void> {
  const writer = (
    idx: number,
    len: number
  ): C.Channel<unknown, unknown, unknown, unknown, never, Out, void> =>
    idx === len
      ? Unit.unit
      : ZipRight.zipRight_(C.write(CK.unsafeGet_(outs, idx)), writer(idx + 1, len))

  return writer(0, CK.size(outs))
}
