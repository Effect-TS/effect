// ets_tracing: off

import type * as E from "../../../../Either"
import type * as Ex from "../../../../Exit"
import * as H from "../../../../Hub"
import * as FromQueue from "./fromQueue"
import * as Managed from "./managed"

export function fromHub<Err, Done, Elem>(
  hub: H.Hub<Ex.Exit<E.Either<Err, Done>, Elem>>
) {
  return Managed.managed_(H.subscribe(hub), FromQueue.fromQueue)
}
