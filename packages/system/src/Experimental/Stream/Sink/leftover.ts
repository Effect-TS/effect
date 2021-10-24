// ets_tracing: off

import type * as CK from "../../../Collections/Immutable/Chunk"
import * as CH from "../Channel"
import * as C from "./core"

export function leftover<L>(
  c: CK.Chunk<L>
): C.Sink<unknown, unknown, unknown, never, L, void> {
  return new C.Sink(CH.write(c))
}
