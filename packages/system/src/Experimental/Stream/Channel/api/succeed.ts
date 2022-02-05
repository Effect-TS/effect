// ets_tracing: off

import * as C from "../core.js"

export function succeed<Z>(
  z: Z
): C.Channel<unknown, unknown, unknown, unknown, never, never, Z> {
  return C.end(z)
}
