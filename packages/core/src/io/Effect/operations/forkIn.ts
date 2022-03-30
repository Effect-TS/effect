import type { LazyArg } from "../../../data/Function"
import type { Fiber } from "../../Fiber"
import type { Scope } from "../../Scope"
import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * Forks the effect in the specified scope. The fiber will be interrupted
 * when the scope is closed.
 *
 * @tsplus fluent ets/Effect forkIn
 */
export function forkIn_<R, E, A>(
  self: Effect<R, E, A>,
  scope: LazyArg<Scope>,
  __tsplusTrace?: string
): RIO<R, Fiber.Runtime<E, A>> {
  return Effect.uninterruptibleMask(({ restore }) =>
    restore(self)
      .forkDaemon()
      .tap((fiber) => scope().addFinalizer(fiber.interrupt()))
  )
}

/**
 * Forks the effect in the specified scope. The fiber will be interrupted
 * when the scope is closed.
 */
export const forkIn = Pipeable(forkIn_)
