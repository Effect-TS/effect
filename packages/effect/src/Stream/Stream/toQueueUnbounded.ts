import { toManaged_ } from "../../Effect/toManaged"
import { pipe } from "../../Function"
import * as M from "../../Managed"
import type { Dequeue } from "../../Queue"
import { makeUnbounded } from "../../Queue"
import type * as TK from "../Take"
import type { Stream } from "./definitions"
import { intoManaged_ } from "./intoManaged"

export function toQueueUnbounded<R, E, A>(
  stream: Stream<R, E, A>
): M.Managed<R, never, Dequeue<TK.Take<E, A>>> {
  return pipe(
    toManaged_(makeUnbounded<TK.Take<E, A>>(), (q) => q.shutdown),
    M.tap((queue) => M.fork(intoManaged_(stream, queue)))
  )
}
