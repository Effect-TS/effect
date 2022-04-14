export const ScopeSym = Symbol.for("@effect/core/io/Scope");
export type ScopeSym = typeof ScopeSym;

export const CloseableScopeSym = Symbol.for("@effect/core/io/Scope/Closeable");
export type CloseableScopeSym = typeof CloseableScopeSym;

export declare namespace Scope {
  type Finalizer = (exit: Exit<unknown, unknown>) => Effect.UIO<unknown>;
  type Closeable = CloseableScope;
}

/**
 * A `Scope` is the foundation of safe, composable resource management in ZIO. A
 * scope has two fundamental operators, `addFinalizer`, which adds a finalizer
 * to the scope, and `close`, which closes a scope and runs all finalizers that
 * have been added to the scope.
 *
 * @tsplus type ets/Scope
 */
export interface Scope {
  readonly [ScopeSym]: ScopeSym;
}

/**
 * @tsplus type ets/Scope/Closeable
 */
export interface CloseableScope extends Scope {
  readonly [CloseableScopeSym]: CloseableScopeSym;
}

/**
 * @tsplus type ets/Scope/Ops
 */
export interface ScopeOps {
  $: ScopeAspects;
  Tag: Tag<Scope>;
}
export const Scope: ScopeOps = {
  $: {},
  Tag: Tag<Scope>()
};

/**
 * @tsplus type ets/Scope/Aspects
 */
export interface ScopeAspects {}
