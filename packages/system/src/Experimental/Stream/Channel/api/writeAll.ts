// ets_tracing: off

import * as A from "../../../../Collections/Immutable/Array/index.js"
import * as C from "../core.js"
import * as ZipRight from "./zipRight.js"

export function writeAll<Out>(
  ...outs: A.Array<Out>
): C.Channel<unknown, unknown, unknown, unknown, never, Out, void> {
  return A.reduceRight_(
    outs,
    C.end(undefined) as C.Channel<unknown, unknown, unknown, unknown, never, Out, void>,
    (out, conduit) => ZipRight.zipRight_(C.write(out), conduit)
  )
}
