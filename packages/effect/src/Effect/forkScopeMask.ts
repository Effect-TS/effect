import type { Exit } from "../Exit"
import { some } from "../Option"
import type { Scope } from "../Scope"
import type { Effect } from "."
import { IOverrideForkScope } from "."
import { forkScopeWith } from "./scope"

export class ForkScopeRestore {
  constructor(private scope: Scope<Exit<any, any>>) {}

  readonly restore = <S, R, E, A>(fa: Effect<S, R, E, A>): Effect<S, R, E, A> =>
    new IOverrideForkScope(fa, some(this.scope))
}

/**
 * Captures the fork scope, before overriding it with the specified new
 * scope, passing a function that allows restoring the fork scope to
 * what it was originally.
 */
export function forkScopeMask(newScope: Scope<Exit<any, any>>) {
  return <S, R, E, A>(f: (restore: ForkScopeRestore) => Effect<S, R, E, A>) =>
    forkScopeWith(
      (scope) => new IOverrideForkScope(f(new ForkScopeRestore(scope)), some(newScope))
    )
}
