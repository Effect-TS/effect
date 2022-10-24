import * as Context from "@fp-ts/data/Context"

/**
 * @category symbol
 * @since 1.0.0
 */
export const ScopeSym = Symbol.for("@effect/core/io/Scope")

/**
 * @category symbol
 * @since 1.0.0
 */
export type ScopeSym = typeof ScopeSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const CloseableScopeSym = Symbol.for("@effect/core/io/Scope/Closeable")

/**
 * @category symbol
 * @since 1.0.0
 */
export type CloseableScopeSym = typeof CloseableScopeSym

/**
 * @since 1.0.0
 */
export declare namespace Scope {
  type Finalizer = (exit: Exit<unknown, unknown>) => Effect<never, never, unknown>
  type Closeable = CloseableScope
}

/**
 * A `Scope` is the foundation of safe, composable resource management in ZIO. A
 * scope has two fundamental operators, `addFinalizer`, which adds a finalizer
 * to the scope, and `close`, which closes a scope and runs all finalizers that
 * have been added to the scope.
 *
 * @tsplus type effect/core/io/Scope
 * @category model
 * @since 1.0.0
 */
export interface Scope {
  readonly [ScopeSym]: ScopeSym
}

/**
 * @tsplus type effect/core/io/Scope/Closeable
 * @category model
 * @since 1.0.0
 */
export interface CloseableScope extends Scope {
  readonly [CloseableScopeSym]: CloseableScopeSym
}

/**
 * @tsplus type effect/core/io/Scope.Ops
 * @category model
 * @since 1.0.0
 */
export interface ScopeOps {
  $: ScopeAspects
  Tag: Context.Tag<Scope>
}
export const Scope: ScopeOps = {
  $: {},
  Tag: Context.Tag<Scope>()
}

/**
 * @tsplus type effect/core/io/Scope.Aspects
 * @category model
 * @since 1.0.0
 */
export interface ScopeAspects {}
