import type { UIO } from "../../Effect"
import { IFiberRefDelete } from "../../Effect/definition/primitives"
import type { FiberRef } from "../definition"

/**
 * @tsplus fluent ets/XFiberRef delete
 * @tsplus fluent ets/XFiberRefRuntime delete
 */
export function _delete<A>(self: FiberRef.Runtime<A>, __trace?: string): UIO<void> {
  return new IFiberRefDelete(self, __trace)
}

export { _delete as delete }
