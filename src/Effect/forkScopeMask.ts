import type { Exit } from "../Exit"
import { some } from "../Option"
import type { Scope } from "../Scope"
import type { Effect } from "."
import { IOverrideForkScope } from "."
import { forkScopeWith } from "./scope"

export class ForkScopeRestore {
  constructor(private scope: Scope<Exit<any, any>>) {}

  readonly restore = <R, E, A>(fa: Effect<R, E, A>): Effect<R, E, A> =>
    new IOverrideForkScope(fa, some(this.scope))
}

/**
 * Captures the fork scope, before overriding it with the specified new
 * scope, passing a function that allows restoring the fork scope to
 * what it was originally.
 */
export function forkScopeMask(newScope: Scope<Exit<any, any>>) {
  return <R, E, A>(f: (restore: ForkScopeRestore) => Effect<R, E, A>) =>
    forkScopeWith(
      (scope) => new IOverrideForkScope(f(new ForkScopeRestore(scope)), some(newScope))
    )
}
