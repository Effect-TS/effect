import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import type * as Fiber from "../../Fiber"
import type { Scope } from "../../Scope"
import type { RIO } from "../definition"
import { Effect, IFork } from "../definition"

/**
 * @tsplus fluent ets/Effect forkIn
 */
export function forkIn_<R, E, A>(
  self: Effect<R, E, A>,
  scope: LazyArg<Scope>,
  __tsplusTrace?: string
): RIO<R, Fiber.Runtime<E, A>> {
  return Effect.suspendSucceed(new IFork(self, () => Option.some(scope()), __tsplusTrace))
}

/**
 * @ets_data_first forkIn_
 */
export function forkIn(scope: LazyArg<Scope>, __tsplusTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): RIO<R, Fiber.Runtime<E, A>> =>
    self.forkIn(scope)
}
