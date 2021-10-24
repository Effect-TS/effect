// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk"
import type { Predicate } from "../../../Function"
import * as CH from "../Channel"
import * as C from "./core"

export function dropWhile<Err, In>(
  p: Predicate<In>
): C.Sink<unknown, Err, In, Err, In, any> {
  const loop: CH.Channel<
    unknown,
    Err,
    CK.Chunk<In>,
    unknown,
    Err,
    CK.Chunk<In>,
    any
  > = CH.readWith(
    (in_) => {
      const leftover = CK.dropWhile_(in_, p)
      const more = CK.isEmpty(leftover)

      return more
        ? loop
        : CH.zipRight_(CH.write(leftover), CH.identity<Err, CK.Chunk<In>, any>())
    },
    (_) => CH.fail(_),
    (_) => CH.unit
  )

  return new C.Sink(loop)
}
