// ets_tracing: off

import type * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

export function leftover<L>(
  c: CK.Chunk<L>
): C.Sink<unknown, unknown, unknown, never, L, void> {
  return new C.Sink(CH.write(c))
}
