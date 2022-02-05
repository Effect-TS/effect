// ets_tracing: off

import * as H from "../../../../Hub/index.js"
import type * as M from "../../../../Managed/index.js"
import type * as TK from "../../Take/index.js"
import type * as C from "../core.js"
import * as RunIntoManaged from "./runIntoManaged.js"

/**
 * Like `Stream#runIntoHub`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function runIntoHubManaged_<R, R1, E extends E1, E1, A, Z>(
  self: C.Stream<R, E, A>,
  hub: H.XHub<R1, never, never, unknown, TK.Take<E1, A>, Z>
): M.Managed<R & R1, E | E1, void> {
  return RunIntoManaged.runIntoManaged_(self, H.toQueue(hub))
}

/**
 * Like `Stream#runIntoHub`, but provides the result as a `Managed` to allow for scope
 * composition.
 *
 * @ets_data_first runIntoHubManaged_
 */
export function runIntoHubManaged<R1, E1, A, Z>(
  hub: H.XHub<R1, never, never, unknown, TK.Take<E1, A>, Z>
) {
  return <R, E extends E1>(self: C.Stream<R, E, A>) => runIntoHubManaged_(self, hub)
}
