import * as T from "./deps"
import { makeExit_ } from "./makeExit_"

/**
 * Lifts a `Effect<S, R, E, A>` into `Managed<S, R, E, A>` with a release action
 * that handles `Exit`. The acquire and release actions will be performed uninterruptibly.
 */
export const makeExit = <S1, R1, E1, A>(
  release: (a: A, exit: T.Exit<any, any>) => T.Effect<S1, R1, E1, any>
) => <S, R, E>(acquire: T.Effect<S, R, E, A>) => makeExit_(acquire, release)
