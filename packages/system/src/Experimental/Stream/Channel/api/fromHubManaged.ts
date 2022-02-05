// ets_tracing: off

import type * as E from "../../../../Either/index.js"
import type * as Ex from "../../../../Exit/index.js"
import * as H from "../../../../Hub/index.js"
import * as M from "../../../../Managed/index.js"
import type * as C from "../core.js"
import * as FromQueue from "./fromQueue.js"

export function fromHubManaged<Err, Done, Elem>(
  hub: H.Hub<E.Either<Ex.Exit<Err, Done>, Elem>>
): M.UIO<C.Channel<unknown, unknown, unknown, unknown, Err, Elem, Done>> {
  return M.map_(H.subscribe(hub), FromQueue.fromQueue)
}
