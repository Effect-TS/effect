// ets_tracing: off

import { pipe } from "../../Function/index.js"
import * as Q from "../../Queue/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import type * as TK from "../Take/index.js"
import type { Stream } from "./definitions.js"
import { intoManaged_ } from "./intoManaged.js"

export function toQueueUnbounded<R, E, A>(
  stream: Stream<R, E, A>
): M.Managed<R, never, Q.Dequeue<TK.Take<E, A>>> {
  return pipe(
    T.toManagedRelease_(Q.makeUnbounded<TK.Take<E, A>>(), Q.shutdown),
    M.tap((queue) => M.fork(intoManaged_(stream, queue)))
  )
}
