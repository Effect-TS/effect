// ets_tracing: off

import * as O from "../../../../Option/index.js"
import * as C from "../core.js"

export function read<In>(): C.Channel<
  unknown,
  unknown,
  In,
  unknown,
  O.None,
  never,
  In
> {
  return C.readOrFail(O.none as O.None)
}
