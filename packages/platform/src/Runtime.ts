/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause"
import type * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"

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
    effect: Effect.Effect<A, E>,
    options?: {
      readonly disableErrorReporting?: boolean
      readonly teardown?: Teardown
    }
  ): void
}
