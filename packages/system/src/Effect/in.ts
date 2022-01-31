// ets_tracing: off

import { head } from "../Collections/Immutable/Array/index.js"
import * as Fiber from "../Fiber/index.js"
import { pipe } from "../Function/index.js"
import * as O from "../Option/index.js"
import type { Scope } from "../Scope/index.js"
import * as core from "./core.js"
import { forkDaemon } from "./core-scope.js"
import type { Effect } from "./effect.js"
import * as interruption from "./interruption.js"

/**
 * Returns a new effect whose scope will be extended by the specified scope.
 * This means any finalizers associated with the effect will not be executed
 * until the specified scope is closed.
 *
 * @ets_data_first in_
 */
function _in(scope: Scope<any>, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) => in_(self, scope, __trace)
}

/**
 * Returns a new effect whose scope will be extended by the specified scope.
 * This means any finalizers associated with the effect will not be executed
 * until the specified scope is closed.
 */
export function in_<R, E, A>(
  self: Effect<R, E, A>,
  scope: Scope<any>,
  __trace?: string
) {
  return interruption.uninterruptibleMask(({ restore }) =>
    pipe(
      forkDaemon(restore(self), __trace),
      core.chain((fiber) =>
        pipe(
          scope.extend(fiber.scope),
          core.chain(() =>
            pipe(
              restore(Fiber.join(fiber)),
              interruption.onInterrupt((x) =>
                pipe(
                  Array.from(x),
                  head,
                  O.fold(
                    () => Fiber.interrupt(fiber),
                    (id) => fiber.interruptAs(id)
                  )
                )
              )
            )
          )
        )
      )
    )
  )
}

export { _in as in }
