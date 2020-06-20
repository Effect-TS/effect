import * as O from "../../Option"
import { Runtime } from "../Fiber/fiber"
import { globalScope } from "../Scope"

import { AsyncR, Effect } from "./effect"
import { IFork } from "./primitives"

/**
 * Forks the effect into a new fiber attached to the global scope. Because the
 * new fiber is attached to the global scope, when the fiber executing the
 * returned effect terminates, the forked fiber will continue running.
 */
export const forkDaemon = <S, R, E, A>(
  value: Effect<S, R, E, A>
): AsyncR<R, Runtime<E, A>> => new IFork(value, O.some(globalScope))
