// ets_tracing: off

import type { FiberID } from "../Fiber/id.js"
import { AtomicReference } from "../Support/AtomicReference/index.js"
import { Promise } from "./promise.js"
import { Pending } from "./state.js"

export function unsafeMake<E, A>(fiberId: FiberID) {
  return new Promise<E, A>(new AtomicReference(new Pending([])), [fiberId])
}
