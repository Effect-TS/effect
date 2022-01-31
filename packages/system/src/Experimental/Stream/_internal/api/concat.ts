// ets_tracing: off

import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Concatenates the specified stream with this stream, resulting in a stream
 * that emits the elements from this stream and then the elements from the specified stream.
 */
export function concat_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  that: C.Stream<R1, E1, A1>
): C.Stream<R & R1, E | E1, A | A1> {
  return new C.Stream<R & R1, E | E1, A | A1>(CH.zipRight_(self.channel, that.channel))
}

/**
 * Concatenates the specified stream with this stream, resulting in a stream
 * that emits the elements from this stream and then the elements from the specified stream.
 *
 * @ets_data_first concat_
 */
export function concat<R1, E1, A1>(that: C.Stream<R1, E1, A1>) {
  return <R, E, A>(self: C.Stream<R, E, A>) => concat_(self, that)
}
