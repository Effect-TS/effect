import type { Pipeable } from "./Pipeable.js"
import type { Scope } from "./Scope.js"
import type { ScopedRefTypeId } from "./ScopedRef.impl.js"
import type { SynchronizedRef } from "./SynchronizedRef.js"

export * from "./internal/Jumpers/ScopedRef.js"
export * from "./ScopedRef.impl.js"

export declare namespace ScopedRef {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./ScopedRef.impl.js"
}
/**
 * A `ScopedRef` is a reference whose value is associated with resources,
 * which must be released properly. You can both get the current value of any
 * `ScopedRef`, as well as set it to a new value (which may require new
 * resources). The reference itself takes care of properly releasing resources
 * for the old value whenever a new value is obtained.
 *
 * @since 2.0.0
 * @category models
 */
export interface ScopedRef<A> extends ScopedRef.Variance<A>, Pipeable {
  /** @internal */
  readonly ref: SynchronizedRef<readonly [Scope.Closeable, A]>
}

/**
 * @since 2.0.0
 */
export declare namespace ScopedRef {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<A> {
    readonly [ScopedRefTypeId]: {
      readonly _A: (_: never) => A
    }
  }
}
