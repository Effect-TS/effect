import { Exit } from "../Exit/exit"
import { Scope } from "../Scope"

import { Effect } from "./effect"
import { IGetForkScope } from "./primitives"

/**
 * Retrieves the scope that will be used to supervise forked effects.
 */
export const forkScopeWith = <S, R, E, A>(
  f: (_: Scope<Exit<any, any>>) => Effect<S, R, E, A>
) => new IGetForkScope(f)
