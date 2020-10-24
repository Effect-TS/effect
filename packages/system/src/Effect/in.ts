import * as Fiber from "../Fiber"
import { flow, pipe } from "../Function"
import { first, from } from "../List"
import * as O from "../Option"
import type { Scope } from "../Scope"
import { chain } from "./core"
import { forkDaemon } from "./core-scope"
import type { Effect } from "./effect"
import { onInterrupt } from "./onInterrupt"
import { uninterruptibleMask } from "./uninterruptibleMask"

/**
 * Returns a new effect whose scope will be extended by the specified scope.
 * This means any finalizers associated with the effect will not be executed
 * until the specified scope is closed.
 */
function in_(scope: Scope<any>) {
  return <R, E, A>(self: Effect<R, E, A>) =>
    uninterruptibleMask(({ restore }) =>
      pipe(
        self,
        restore,
        forkDaemon,
        chain((fiber) =>
          pipe(
            scope.extend(fiber.scope),
            chain(() =>
              pipe(
                restore(Fiber.join(fiber)),
                onInterrupt(
                  flow(
                    from,
                    first,
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

export { in_ as in }
