import { IFiberRefDelete } from "@effect-ts/core/io/Effect/definition/primitives";

/**
 * @tsplus fluent ets/FiberRef delete
 */
export function _delete<A>(self: FiberRef<A>, __tsplusTrace?: string): UIO<void> {
  return new IFiberRefDelete(self, __tsplusTrace);
}

export { _delete as delete };
