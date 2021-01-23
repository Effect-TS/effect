import { pipe } from "../../Function"
import * as Q from "../../Queue"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import type * as TK from "../Take"
import type { Stream } from "./definitions"
import { intoManaged_ } from "./intoManaged"

export function toQueueUnbounded<R, E, A>(
  stream: Stream<R, E, A>
): M.Managed<R, never, Q.Dequeue<TK.Take<E, A>>> {
  return pipe(
    T.toManaged_(Q.makeUnbounded<TK.Take<E, A>>(), (q) => q.shutdown),
    M.tap((queue) => M.fork(intoManaged_(stream, queue)))
  )
}
