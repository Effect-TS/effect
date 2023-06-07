/**
 * @since 1.0.0
 */
import * as Cause from "@effect/io/Cause"
import type { Effect } from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"

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
    effect: Effect<never, E, A>,
    teardown?: Teardown
  ): void
}
