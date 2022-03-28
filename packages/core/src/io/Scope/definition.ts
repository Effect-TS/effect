import type { LazyArg } from "../../data/Function"
import type { Has } from "../../data/Has"
import { mergeEnvironments, tag } from "../../data/Has"
import type { UIO } from "../Effect"
import { Effect } from "../Effect"
import type { Exit } from "../Exit"

export const ScopeSym = Symbol.for("@effect-ts/core/io/Scope")
export type ScopeSym = typeof ScopeSym

export type Finalizer = (exit: Exit<unknown, unknown>) => UIO<unknown>

export declare namespace Scope {
  type Closeable = CloseableScope
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
  readonly [ScopeSym]: ScopeSym
}

/**
 * @tsplus type ets/ScopeOps
 */
export interface ScopeOps {}
export const Scope: ScopeOps = {}

export abstract class AbstractScope implements Scope {
  readonly [ScopeSym]: ScopeSym = ScopeSym

  /**
   * Forks a new scope that is a child of this scope. The child scope will
   * automatically be closed when this scope is closed.
   */
  abstract _fork: UIO<Scope.Closeable>

  /**
   * Adds a finalizer to this scope. The finalizer is guaranteed to be run when
   * the scope is closed.
   */
  abstract _addFinalizerExit(finalizer: Finalizer): UIO<void>

  /**
   * A simplified version of `addFinalizerWith` when the `finalizer` does not
   * depend on the `Exit` value that the scope is closed with.
   */
  _addFinalizer(finalizer: LazyArg<UIO<unknown>>): UIO<void> {
    return this._addFinalizerExit(finalizer)
  }

  /**
   * Extends the scope of an `Effect` workflow that needs a scope into this
   * scope by providing it to the workflow but not closing the scope when the
   * workflow completes execution. This allows extending a scoped value into a
   * larger scope.
   */
  _extend<R, E, A>(effect: LazyArg<Effect<R & HasScope, E, A>>): Effect<R, E, A> {
    return Effect.succeed(effect).flatMap((effect) =>
      effect.provideSomeEnvironment((r: R) => mergeEnvironments(HasScope, r, this))
    )
  }
}

export const HasScope = tag<Scope>(ScopeSym)

export type HasScope = Has<Scope>

/**
 * @tsplus type ets/Scope/Closeable
 * @tsplus companion ets/Scope/CloseableOps
 */
export class CloseableScope extends AbstractScope {
  readonly _fork: UIO<Scope.Closeable>
  readonly _addFinalizerExit: (finalizer: Finalizer) => UIO<void>

  /**
   * Closes a scope with the specified exit value, running all finalizers that
   * have been added to the scope.
   */
  readonly _close: (exit: LazyArg<Exit<unknown, unknown>>) => UIO<void>

  constructor(params: {
    readonly fork: UIO<Scope.Closeable>
    readonly addFinalizerExit: (finalizer: Finalizer) => UIO<void>
    readonly close: (exit: LazyArg<Exit<unknown, unknown>>) => UIO<void>
  }) {
    super()
    this._fork = params.fork
    this._addFinalizerExit = params.addFinalizerExit
    this._close = params.close
  }

  /**
   * Uses the scope by providing it to an `Effect` workflow that needs a scope,
   * guaranteeing that the scope is closed with the result of that workflow as
   * soon as the workflow completes execution, whether by success, failure, or
   * interruption.
   */
  _use<R, E, A>(effect: LazyArg<Effect<R & HasScope, E, A>>): Effect<R, E, A> {
    return this._extend(effect).onExit((exit) => this._close(exit))
  }
}

/**
 * @tsplus macro remove
 */
export function concreteScope(_: Scope): asserts _ is AbstractScope {
  //
}

/**
 * @tsplus macro remove
 */
export function concreteCloseableScope(_: Scope): asserts _ is CloseableScope {
  //
}
