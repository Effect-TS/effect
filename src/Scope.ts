/**
 * @since 2.0.0
 */
import type { Effect } from "./Effect.js"
import type { ExecutionStrategy } from "./ExecutionStrategy.js"
import type { Exit } from "./Exit.js"
import type { CloseableScope, ScopeTypeId } from "./impl/Scope.js"
import type { Pipeable } from "./Pipeable.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/Scope.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/Scope.js"

/**
 * @since 2.0.0
 */
export declare namespace Scope {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Scope.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface Scope extends Pipeable {
  readonly [ScopeTypeId]: ScopeTypeId
  readonly strategy: ExecutionStrategy
  /**
   * @internal
   */
  readonly fork: (strategy: ExecutionStrategy) => Effect<never, never, Scope.Closeable>
  /**
   * @internal
   */
  readonly addFinalizer: (finalizer: Scope.Finalizer) => Effect<never, never, void>
}

/**
 * @since 2.0.0
 */
export declare namespace Scope {
  /**
   * @since 2.0.0
   * @category model
   */
  export type Finalizer = (exit: Exit<unknown, unknown>) => Effect<never, never, void>
  /**
   * @since 2.0.0
   * @category model
   */
  export type Closeable = CloseableScope
}
