import * as Scope from "../../Scope.ts"

const abandonedScopes = new WeakSet<Scope.Scope>()

/**
 * Marks every run under `parent` as abandoned, without the engine retaining
 * their instances.
 *
 * @internal
 */
export const markScopeAbandoned = (parent: Scope.Scope): void => {
  abandonedScopes.add(parent)
}

/**
 * Reports whether `scope` or its parent scope was marked abandoned.
 *
 * @internal
 */
export const isScopeAbandoned = (scope: Scope.Scope): boolean =>
  abandonedScopes.has(scope) || (scope.parent !== undefined && abandonedScopes.has(scope.parent))

/**
 * Reuses `prev` when it is still an empty child of `parent`, otherwise forks a
 * fresh child scope from `parent`.
 *
 * @internal
 */
export const reuseOrForkScope = (
  prev: Scope.Closeable | undefined,
  parent: Scope.Scope
): Scope.Closeable =>
  prev !== undefined && prev.parent === parent && prev.state._tag === "Empty"
    ? prev
    : Scope.forkUnsafe(parent)
