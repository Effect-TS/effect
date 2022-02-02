// ets_tracing: off

import * as O from "../../../../Option"
import * as C from "../core"

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
