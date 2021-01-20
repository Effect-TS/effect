import { effectTotal } from "../Effect/core"
import type { FiberID } from "../Fiber/id"
import { unsafeMake } from "./unsafeMake"

/**
 * Makes a new promise to be completed by the fiber with the specified id.
 */
export const makeAs = <E, A>(fiberId: FiberID) =>
  effectTotal(() => unsafeMake<E, A>(fiberId))
