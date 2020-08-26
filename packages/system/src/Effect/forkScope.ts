import type { Exit } from "../Exit"
import type { Scope } from "../Scope"
import { succeed } from "./core"
import type { Async } from "./effect"
import { IGetForkScope } from "./primitives"

/**
 * Retrieves the scope that will be used to supervise forked effects.
 */
export const forkScope: Async<Scope<Exit<any, any>>> = new IGetForkScope(succeed)
