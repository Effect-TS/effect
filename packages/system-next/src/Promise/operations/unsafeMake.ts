// ets_tracing: off

import type { FiberId } from "../../FiberId"
import { AtomicReference } from "../../Support/AtomicReference"
import { Promise } from "../definition"
import { Pending } from "../state"

export function unsafeMake<E, A>(fiberId: FiberId): Promise<E, A> {
  return new Promise(new AtomicReference(new Pending([])), fiberId)
}
