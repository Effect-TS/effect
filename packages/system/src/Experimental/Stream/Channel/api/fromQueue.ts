// ets_tracing: off

import * as E from "../../../../Either/index.js"
import * as Ex from "../../../../Exit/index.js"
import * as Q from "../../../../Queue/index.js"
import * as C from "../core.js"
import * as ZipRight from "./zipRight.js"

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
