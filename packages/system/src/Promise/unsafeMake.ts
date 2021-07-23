// ets_tracing: off

import type { FiberID } from "../Fiber/id"
import { AtomicReference } from "../Support/AtomicReference"
import { Promise } from "./promise"
import { Pending } from "./state"

export function unsafeMake<E, A>(fiberId: FiberID) {
  return new Promise<E, A>(new AtomicReference(new Pending([])), [fiberId])
}
