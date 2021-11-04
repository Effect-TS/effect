// ets_tracing: off

import * as E from "../../../../Either"
import * as Ex from "../../../../Exit"
import * as Q from "../../../../Queue"
import * as C from "../core"
import * as ZipRight from "./zipRight"

export function fromQueue<Err, Elem, Done>(
  queue: Q.Dequeue<E.Either<Ex.Exit<Err, Done>, Elem>>
): C.Channel<unknown, unknown, unknown, unknown, Err, Elem, Done> {
  return C.chain_(
    C.fromEffect(Q.take(queue)),
    E.fold(
      Ex.fold(
        (cause) => C.failCause(cause),
        (done) => C.end(done)
      ),
      (elem) => ZipRight.zipRight_(C.write(elem), fromQueue(queue))
    )
  )
}
