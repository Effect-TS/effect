import * as C from "../../Cause"
import * as T from "../../Effect"
import * as M from "../../Managed"
import * as O from "../../Option"
import type { XQueue } from "../../Queue/xqueue"
import * as TK from "../Take"
import type { Stream } from "./definitions"

/**
 * Like `into`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function intoManaged_<R, R1, E, A>(
  stream: Stream<R, E, A>,
  queue: XQueue<R1, unknown, never, unknown, TK.Take<E, A>, unknown>
): M.Managed<R & R1, E, void> {
  return M.chain_(stream.proc, (as) => {
    const go: T.Effect<R & R1, never, void> = T.foldCauseM_(
      as,
      (o) =>
        O.fold_(
          C.sequenceCauseOption(o),
          () => T.asUnit(queue.offer(TK.end)),
          (c) => T.andThen_(queue.offer(TK.halt(c)), go)
        ),
      (a) => T.andThen_(queue.offer(TK.chunk(a)), go)
    )

    return T.toManaged_(go)
  })
}

/**
 * Like `into`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function intoManaged<R, R1, E, A>(
  queue: XQueue<R1, unknown, never, unknown, TK.Take<E, A>, unknown>
) {
  return (self: Stream<R, E, A>) => intoManaged_(self, queue)
}
