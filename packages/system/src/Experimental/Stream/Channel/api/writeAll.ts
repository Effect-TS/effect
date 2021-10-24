// ets_tracing: off

import * as A from "../../../../Collections/Immutable/Array"
import * as C from "../core"
import * as ZipRight from "./zipRight"

export function writeAll<Out>(
  ...outs: A.Array<Out>
): C.Channel<unknown, unknown, unknown, unknown, never, Out, void> {
  return A.reduceRight_(
    outs,
    C.end(undefined) as C.Channel<unknown, unknown, unknown, unknown, never, Out, void>,
    (out, conduit) => ZipRight.zipRight_(C.write(out), conduit)
  )
}
