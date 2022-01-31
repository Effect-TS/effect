// ets_tracing: off

import type * as E from "../../../../Either/index.js"
import type * as Ex from "../../../../Exit/index.js"
import * as H from "../../../../Hub/index.js"
import type * as C from "../core.js"
import * as FromQueue from "./fromQueue.js"
import * as Managed from "./managed.js"

export function fromHub<Err, Done, Elem>(
  hub: H.Hub<E.Either<Ex.Exit<Err, Done>, Elem>>
): C.Channel<unknown, unknown, unknown, unknown, Err, Elem, Done> {
  return Managed.managed_(H.subscribe(hub), FromQueue.fromQueue)
}
