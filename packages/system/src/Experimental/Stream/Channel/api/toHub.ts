// ets_tracing: off

import type * as E from "../../../../Either/index.js"
import type * as Ex from "../../../../Exit/index.js"
import * as H from "../../../../Hub/index.js"
import type * as C from "../core.js"
import * as ToQueue from "./toQueue.js"

export function toHub<Err, Done, Elem>(
  hub: H.Hub<E.Either<Ex.Exit<Err, Done>, Elem>>
): C.Channel<unknown, Err, Elem, Done, never, never, any> {
  return ToQueue.toQueue(H.toQueue(hub))
}
