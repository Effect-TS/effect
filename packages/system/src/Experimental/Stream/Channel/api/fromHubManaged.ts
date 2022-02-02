// ets_tracing: off

import type * as E from "../../../../Either"
import type * as Ex from "../../../../Exit"
import * as H from "../../../../Hub"
import * as M from "../../../../Managed"
import type * as C from "../core"
import * as FromQueue from "./fromQueue"

export function fromHubManaged<Err, Done, Elem>(
  hub: H.Hub<E.Either<Ex.Exit<Err, Done>, Elem>>
): M.UIO<C.Channel<unknown, unknown, unknown, unknown, Err, Elem, Done>> {
  return M.map_(H.subscribe(hub), FromQueue.fromQueue)
}
