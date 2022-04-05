export const ScopeSym = Symbol.for("@effect-ts/core/io/Scope");
export type ScopeSym = typeof ScopeSym;

export const CloseableScopeSym = Symbol.for("@effect-ts/core/io/Scope/Closeable");
export type CloseableScopeSym = typeof CloseableScopeSym;

export type Finalizer = (exit: Exit<unknown, unknown>) => UIO<unknown>;

export declare namespace Scope {
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
}
export const Scope: ScopeOps = {
  $: {}
};

/**
 * @tsplus type ets/Scope/Aspects
 */
export interface ScopeAspects {}

export const HasScope = Service<Scope>(ScopeSym);

export type HasScope = Has<Scope>;
