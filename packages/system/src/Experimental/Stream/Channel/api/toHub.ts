// ets_tracing: off

import type * as E from "../../../../Either"
import type * as Ex from "../../../../Exit"
import * as H from "../../../../Hub"
import * as ToQueue from "./toQueue"

export function toHub<Err, Done, Elem>(hub: H.Hub<Ex.Exit<E.Either<Err, Done>, Elem>>) {
  return ToQueue.toQueue(H.toQueue(hub))
}
