// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../../../Function/index.js"
import * as M from "../../../../Managed/index.js"
import * as Q from "../../../../Queue/index.js"
import * as CH from "../../Channel/index.js"
import * as TK from "../../Take/index.js"
import type * as C from "../core.js"

/**
 * Like `Stream#into`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function runIntoManaged_<R, R1, E extends E1, E1, A, Z>(
  self: C.Stream<R, E, A>,
  queue: Q.XQueue<R1, never, never, unknown, TK.Take<E1, A>, Z>
): M.Managed<R & R1, E | E1, void> {
  const writer: CH.Channel<
    R,
    E,
    CK.Chunk<A>,
    unknown,
    E,
    TK.Take<E | E1, A>,
    any
  > = CH.readWithCause(
    (in_) => CH.zipRight_(CH.write(TK.chunk(in_)), writer),
    (cause) => CH.write(TK.halt(cause)),
    (_) => CH.write(TK.end)
  )

  return pipe(
    self.channel[">>>"](writer),
    CH.mapOutEffect((_) => Q.offer_(queue, _)),
    CH.drain,
    CH.runManaged,
    M.asUnit
  )
}

/**
 * Like `Stream#into`, but provides the result as a `Managed` to allow for scope
 * composition.
 *
 * @ets_data_first runIntoManaged_
 */
export function runIntoManaged<R1, E1, A, Z>(
  queue: Q.XQueue<R1, never, never, unknown, TK.Take<E1, A>, Z>
) {
  return <R, E extends E1>(self: C.Stream<R, E, A>) => runIntoManaged_(self, queue)
}
