// ets_tracing: off

import type * as CS from "../../../../Cause/index.js"
import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchAllCause_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  f: (cause: CS.Cause<E>) => C.Stream<R1, E1, A1>
): C.Stream<R & R1, E1, A | A1> {
  const channel: CH.Channel<
    R & R1,
    unknown,
    unknown,
    unknown,
    E1,
    CK.Chunk<A | A1>,
    unknown
  > = CH.catchAllCause_(self.channel, (_) => f(_).channel)

  return new C.Stream(channel)
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 *
 * @ets_data_first catchAllCause_
 */
export function catchAllCause<R1, E, E1, A1>(
  f: (cause: CS.Cause<E>) => C.Stream<R1, E1, A1>
) {
  return <R, A>(self: C.Stream<R, E, A>) => catchAllCause_(self, f)
}
