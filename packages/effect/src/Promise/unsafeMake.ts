import type { FiberID } from "../Fiber/id"
import { AtomicReference } from "../Support/AtomicReference"
import { Promise } from "./promise"
import { Pending } from "./state"

export const unsafeMake = <E, A>(fiberId: FiberID) =>
  new Promise<E, A>(new AtomicReference(new Pending([])), [])
