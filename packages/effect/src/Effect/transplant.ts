import * as O from "../Option"

import { Effect } from "./effect"
import { IOverrideForkScope } from "./primitives"
import { forkScopeWith } from "./scope"

export type Grafter = <S, R, E, A>(effect: Effect<S, R, E, A>) => Effect<S, R, E, A>

/**
 * Transplants specified effects so that when those effects fork other
 * effects, the forked effects will be governed by the scope of the
 * fiber that executes this effect.
 *
 * This can be used to "graft" deep grandchildren onto a higher-level
 * scope, effectively extending their lifespans into the parent scope.
 */
export const transplant = <S, R, E, A>(f: (_: Grafter) => Effect<S, R, E, A>) =>
  forkScopeWith((scope) => f((e) => new IOverrideForkScope(e, O.some(scope))))
