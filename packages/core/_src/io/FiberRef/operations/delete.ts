import { IFiberRefDelete } from "@effect/core/io/Effect/definition/primitives"

/**
 * @tsplus fluent ets/FiberRef delete
 */
export function _delete<A, P>(self: FiberRef<A, P>, __tsplusTrace?: string): Effect.UIO<void> {
  return new IFiberRefDelete(self, __tsplusTrace)
}

export { _delete as delete }
