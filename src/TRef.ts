/**
 * @since 2.0.0
 */
import type { TRefTypeId } from "./impl/TRef.js"
import type * as Journal from "./internal/stm/stm/journal.js"
import type { TxnId } from "./internal/stm/stm/txnId.js"
import type { Versioned } from "./internal/stm/stm/versioned.js"
import type { STM } from "./STM.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/TRef.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/TRef.js"
/**
 * @since 2.0.0
 */
export declare namespace TRef {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/TRef.js"
}
/**
 * A `TRef<A>` is a purely functional description of a mutable reference that can
 * be modified as part of a transactional effect. The fundamental operations of
 * a `TRef` are `set` and `get`. `set` transactionally sets the reference to a
 * new value. `get` gets the current value of the reference.
 *
 * NOTE: While `TRef<A>` provides the transactional equivalent of a mutable
 * reference, the value inside the `TRef` should be immutable.
 *
 * @since 2.0.0
 * @category models
 */
export interface TRef<A> extends TRef.Variance<A> {
  /**
   * Note: the method is unbound, exposed only for potential extensions.
   */
  modify<B>(f: (a: A) => readonly [B, A]): STM<never, never, B>
}
/**
 * @internal
 * @since 2.0.0
 */
export interface TRef<A> {
  /** @internal */
  todos: Map<TxnId, Journal.Todo>
  /** @internal */
  versioned: Versioned<A>
}

/**
 * @since 2.0.0
 */
export declare namespace TRef {
  /**
   * @since 2.0.0
   */
  export interface Variance<A> {
    readonly [TRefTypeId]: {
      readonly _A: (_: never) => A
    }
  }
}
