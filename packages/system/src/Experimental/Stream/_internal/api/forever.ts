// ets_tracing: off

import * as CH from "../../Channel"
import * as C from "../core"

/**
 * Repeats this stream forever.
 */
export function forever<R, E, A>(self: C.Stream<R, E, A>): C.Stream<R, E, A> {
  return new C.Stream(CH.repeated(self.channel))
}
