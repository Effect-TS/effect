// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../Effect/index.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

export function dropWhileEffect<R, InErr, In>(
  p: (in_: In) => T.Effect<R, InErr, boolean>
): C.Sink<R, InErr, In, InErr, In, any> {
  const loop: CH.Channel<
    R,
    InErr,
    CK.Chunk<In>,
    unknown,
    InErr,
    CK.Chunk<In>,
    any
  > = CH.readWith(
    (in_) =>
      CH.unwrap(
        T.map_(CK.dropWhileEffect_(in_, p), (leftover) => {
          const more = CK.isEmpty(leftover)

          return more
            ? loop
            : CH.zipRight_(CH.write(leftover), CH.identity<InErr, CK.Chunk<In>, any>())
        })
      ),
    (_) => CH.fail(_),
    (_) => CH.unit
  )

  return new C.Sink(loop)
}
