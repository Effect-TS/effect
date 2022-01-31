// ets_tracing: off

import type * as E from "../../../../Either"
import type * as Ex from "../../../../Exit"
import * as H from "../../../../Hub"
import type * as C from "../core.js"
import * as ToQueue from "./toQueue.js"

export function toHub<Err, Done, Elem>(
  hub: H.Hub<E.Either<Ex.Exit<Err, Done>, Elem>>
): C.Channel<unknown, Err, Elem, Done, never, never, any> {
  return ToQueue.toQueue(H.toQueue(hub))
}
