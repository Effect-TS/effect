import type { UIO } from "../../Effect"
import { IFiberRefDelete } from "../../Effect/definition/primitives"
import type { FiberRef } from "../definition"

function _delete<A>(self: FiberRef.Runtime<A>, __trace?: string): UIO<void> {
  return new IFiberRefDelete(self, __trace)
}

export { _delete as delete }
