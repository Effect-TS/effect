import type * as Scope from "../../Scope.ts"

const exposedScopes = new WeakSet<Scope.Scope>()

/** @internal */
export const markScopeExposed = (scope: Scope.Scope): void => {
  exposedScopes.add(scope)
}

/** @internal */
export const canReleaseSuspendedScope = (scope: Scope.Scope): boolean =>
  scope.state._tag === "Empty" && !exposedScopes.has(scope)
