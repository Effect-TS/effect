// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../../Function/index.js"
import type * as C from "./core.js"
import * as FoldLeftChunks from "./foldLeftChunks.js"
import * as Map from "./map.js"
import * as Suspend from "./suspend.js"

export function mkString<Err>(): C.Sink<unknown, Err, unknown, Err, unknown, string> {
  return Suspend.suspend(() => {
    const strings: string[] = []

    return pipe(
      FoldLeftChunks.foldLeftChunks<Err, unknown, void>(undefined, (_, els) =>
        CK.forEach_(els, (el) => {
          strings.push(String(el))
        })
      ),
      Map.map((_) => strings.join(""))
    )
  })
}
