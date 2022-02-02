// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk"
import { pipe } from "../../../Function"
import type * as C from "./core"
import * as FoldLeftChunks from "./foldLeftChunks"
import * as Map from "./map"
import * as Suspend from "./suspend"

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
