// ets_tracing: off

import * as CS from "../../../../Cause"
import * as E from "../../../../Either"
import * as Ex from "../../../../Exit"
import * as Q from "../../../../Queue"
import * as C from "../core"
import * as ZipRight from "./zipRight"

export function toQueue<Err, Done, Elem>(
  queue: Q.Enqueue<Ex.Exit<E.Either<Err, Done>, Elem>>
): C.Channel<unknown, Err, Elem, Done, never, never, any> {
  return C.readWithCause(
    (in_: Elem) =>
      ZipRight.zipRight_(
        C.fromEffect(Q.offer_(queue, Ex.succeed(in_))),
        toQueue(queue)
      ),
    (cause: CS.Cause<Err>) =>
      C.fromEffect(Q.offer_(queue, Ex.halt(CS.map_(cause, (_) => E.left(_))))),
    (done: Done) => C.fromEffect(Q.offer_(queue, Ex.fail(E.right(done))))
  )
}
