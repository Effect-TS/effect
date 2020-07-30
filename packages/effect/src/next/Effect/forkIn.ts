import * as O from "../../Option"
import { Exit } from "../Exit/exit"
import { Runtime } from "../Fiber/core"
import { Scope } from "../Scope"

import { Effect, AsyncR } from "./effect"
import { IFork } from "./primitives"

/**
 * Returns an effect that forks this effect into its own separate fiber,
 * returning the fiber immediately, without waiting for it to begin
 * executing the effect.
 *
 * The returned fiber can be used to interrupt the forked fiber, await its
 * result, or join the fiber. See `Fiber` for more information.
 *
 * The fiber is forked with interrupt supervision mode, meaning that when the
 * fiber that forks the child exits, the child will be interrupted.
 */
export const forkIn = (scope: Scope<Exit<any, any>>) => <S, R, E, A>(
  value: Effect<S, R, E, A>
): AsyncR<R, Runtime<E, A>> => new IFork(value, O.some(scope))
