/**
 * @since 2.0.0
 */

import type * as Context from "./Context.js"
import type * as Effect from "./Effect.js"
import type * as ExecutionStrategy from "./ExecutionStrategy.js"
import type * as Exit from "./Exit.js"
import * as core from "./internal/core.js"
import * as fiberRuntime from "./internal/fiberRuntime.js"
import type { Pipeable } from "./Pipeable.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const ScopeTypeId: unique symbol = core.ScopeTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type ScopeTypeId = typeof ScopeTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const CloseableScopeTypeId: unique symbol = core.CloseableScopeTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type CloseableScopeTypeId = typeof CloseableScopeTypeId

/**
 * @since 2.0.0
 * @category models
 */
export interface Scope extends Pipeable {
  readonly [ScopeTypeId]: ScopeTypeId
  readonly strategy: ExecutionStrategy.ExecutionStrategy
  /**
   * @internal
   */
  fork(strategy: ExecutionStrategy.ExecutionStrategy): Effect.Effect<Scope.Closeable>
  /**
   * @internal
   */
  addFinalizer(finalizer: Scope.Finalizer): Effect.Effect<void>
}

/**
 * @since 2.0.0
 * @category models
 */
export interface CloseableScope extends Scope, Pipeable {
  readonly [CloseableScopeTypeId]: CloseableScopeTypeId

  /**
   * @internal
   */
  close(exit: Exit.Exit<unknown, unknown>): Effect.Effect<void>
}

/**
 * @since 2.0.0
 * @category context
 */
export const Scope: Context.Tag<Scope, Scope> = fiberRuntime.scopeTag

/**
 * @since 2.0.0
 */
export declare namespace Scope {
  /**
   * @since 2.0.0
   * @category model
   */
  export type Finalizer = (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<void>
  /**
   * @since 2.0.0
   * @category model
   */
  export type Closeable = CloseableScope
}

/**
 * Adds a finalizer to this scope. The finalizer is guaranteed to be run when
 * the scope is closed.
 *
 * @since 2.0.0
 * @category utils
 */
export const addFinalizer: (
  self: Scope,
  finalizer: Effect.Effect<unknown>
) => Effect.Effect<void> = core.scopeAddFinalizer

/**
 * A simplified version of `addFinalizerWith` when the `finalizer` does not
 * depend on the `Exit` value that the scope is closed with.
 *
 * @since 2.0.0
 * @category utils
 */
export const addFinalizerExit: (self: Scope, finalizer: Scope.Finalizer) => Effect.Effect<void> =
  core.scopeAddFinalizerExit

/**
 * Closes a scope with the specified exit value, running all finalizers that
 * have been added to the scope.
 *
 * @since 2.0.0
 * @category destructors
 */
export const close: (self: CloseableScope, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<void> = core.scopeClose

/**
 * Extends the scope of an `Effect` workflow that needs a scope into this
 * scope by providing it to the workflow but not closing the scope when the
 * workflow completes execution. This allows extending a scoped value into a
 * larger scope.
 *
 * @since 2.0.0
 * @category utils
 */
export const extend: {
  (scope: Scope): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Scope>>
  <A, E, R>(effect: Effect.Effect<A, E, R>, scope: Scope): Effect.Effect<A, E, Exclude<R, Scope>>
} = fiberRuntime.scopeExtend

/**
 * Forks a new scope that is a child of this scope. The child scope will
 * automatically be closed when this scope is closed.
 *
 * @since 2.0.0
 * @category utils
 */
export const fork: (
  self: Scope,
  strategy: ExecutionStrategy.ExecutionStrategy
) => Effect.Effect<CloseableScope> = core.scopeFork

/**
 * Uses the scope by providing it to an `Effect` workflow that needs a scope,
 * guaranteeing that the scope is closed with the result of that workflow as
 * soon as the workflow completes execution, whether by success, failure, or
 * interruption.
 *
 * @since 2.0.0
 * @category destructors
 */
export const use: {
  (scope: CloseableScope): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Scope>>
  <A, E, R>(effect: Effect.Effect<A, E, R>, scope: CloseableScope): Effect.Effect<A, E, Exclude<R, Scope>>
} = fiberRuntime.scopeUse

/**
 * Creates a Scope where Finalizers will run according to the `ExecutionStrategy`.
 *
 * If an ExecutionStrategy is not provided `sequential` will be used.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: (
  executionStrategy?: ExecutionStrategy.ExecutionStrategy
) => Effect.Effect<CloseableScope> = fiberRuntime.scopeMake
