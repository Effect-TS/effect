// ets_tracing: off

import * as C from "../../Cause/index.js"
import * as O from "../../Option/index.js"
import * as Q from "../../Queue/core.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as TK from "../Take/index.js"
import type { Stream } from "./definitions.js"

/**
 * Like `into`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function intoManaged_<R, E, O>(
  stream: Stream<R, E, O>,
  queue: Q.XQueue<R, never, never, unknown, TK.Take<E, O>, unknown>
): M.Managed<R, E, void> {
  return M.chain_(stream.proc, (as) => {
    const go: T.Effect<R, never, void> = T.foldCauseM_(
      as,
      (o) =>
        O.fold_(
          C.sequenceCauseOption(o),
          () => T.asUnit(Q.offer_(queue, TK.end)),
          (c) => T.zipRight_(Q.offer_(queue, TK.halt(c)), go)
        ),
      (a) => T.zipRight_(Q.offer_(queue, TK.chunk(a)), go)
    )

    return M.asUnit(T.toManaged(go))
  })
}

/**
 * Like `into`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function intoManaged<R, E, A>(
  queue: Q.XQueue<R, never, never, unknown, TK.Take<E, A>, unknown>
) {
  return (self: Stream<R, E, A>) => intoManaged_(self, queue)
}
