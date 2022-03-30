import type { UIO } from "../../Effect"
import { IFiberRefDelete } from "../../Effect/definition/primitives"
import type { FiberRef } from "../definition"

/**
 * @tsplus fluent ets/FiberRef delete
 */
export function _delete<A>(self: FiberRef<A>, __tsplusTrace?: string): UIO<void> {
  return new IFiberRefDelete(self, __tsplusTrace)
}

export { _delete as delete }
