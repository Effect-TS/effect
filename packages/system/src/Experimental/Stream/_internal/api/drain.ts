// ets_tracing: off

import * as CH from "../../Channel"
import * as C from "../core"

/**
 * Converts this stream to a stream that executes its effects but emits no
 * elements. Useful for sequencing effects using streams:
 */
export function drain<R, E, A>(self: C.Stream<R, E, A>): C.Stream<R, E, never> {
  return new C.Stream(CH.drain(self.channel))
}
