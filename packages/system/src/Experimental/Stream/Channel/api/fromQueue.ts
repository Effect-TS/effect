// ets_tracing: off

import * as CS from "../../../../Cause"
import * as E from "../../../../Either"
import * as Ex from "../../../../Exit"
import * as Q from "../../../../Queue"
import * as C from "../core"
import * as ZipRight from "./zipRight"

export function fromQueue<Err, Elem, Done>(
  queue: Q.Dequeue<Ex.Exit<E.Either<Err, Done>, Elem>>
): C.Channel<unknown, unknown, unknown, unknown, Err, Elem, Done> {
  return C.chain_(
    C.fromEffect(Q.take(queue)),
    Ex.fold(
      (cause) =>
        E.fold_(
          CS.flipCauseEither(cause),
          (cause) => C.failCause(cause),
          (done) => C.end(done)
        ),
      (elem) => ZipRight.zipRight_(C.write(elem), fromQueue(queue))
    )
  )
}
