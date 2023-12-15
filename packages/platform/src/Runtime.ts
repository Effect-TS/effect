/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import { equals } from "effect/Equal"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import type * as FiberId from "effect/FiberId"

/**
 * @category model
 * @since 1.0.0
 */
export interface Teardown {
  <E, A>(exit: Exit.Exit<E, A>, onExit: (code: number) => void): void
}

/**
 * @category teardown
 * @since 1.0.0
 */
export const defaultTeardown: Teardown = <E, A>(
  exit: Exit.Exit<E, A>,
  onExit: (code: number) => void
) => {
  onExit(Exit.isFailure(exit) && !Cause.isInterruptedOnly(exit.cause) ? 1 : 0)
}

/**
 * @category model
 * @since 1.0.0
 */
export interface RunMain {
  <E, A>(
    effect: Effect.Effect<never, E, A>,
    teardown?: Teardown
  ): void
}

/**
 * @since 1.0.0
 */
export const interruptAll = (id: FiberId.FiberId): Effect.Effect<never, never, void> =>
  Effect.flatMap(rootWithoutSelf, (roots) => {
    if (roots.length === 0) {
      return Effect.unit
    }
    return Effect.flatMap(
      Fiber.interruptAllAs(roots, id),
      () =>
        Effect.flatMap(
          rootWithoutSelf,
          (postInterruptRoots) => postInterruptRoots.length > 0 ? interruptAll(id) : Effect.unit
        )
    )
  })

const rootWithoutSelf = Effect.fiberIdWith((selfId) =>
  Effect.map(Fiber.roots, (roots) => roots.filter((fiber) => !equals(fiber.id(), selfId)))
)
