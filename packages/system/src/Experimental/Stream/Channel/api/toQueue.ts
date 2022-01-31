// ets_tracing: off

import type * as CS from "../../../../Cause/index.js"
import * as E from "../../../../Either/index.js"
import * as Ex from "../../../../Exit/index.js"
import * as Q from "../../../../Queue/index.js"
import * as C from "../core.js"
import * as ZipRight from "./zipRight.js"

export function toQueue<Err, Done, Elem>(
  queue: Q.Enqueue<E.Either<Ex.Exit<Err, Done>, Elem>>
): C.Channel<unknown, Err, Elem, Done, never, never, any> {
  return C.readWithCause(
    (in_: Elem) =>
      ZipRight.zipRight_(C.fromEffect(Q.offer_(queue, E.right(in_))), toQueue(queue)),
    (cause: CS.Cause<Err>) => C.fromEffect(Q.offer_(queue, E.left(Ex.halt(cause)))),
    (done: Done) => C.fromEffect(Q.offer_(queue, E.left(Ex.succeed(done))))
  )
}
