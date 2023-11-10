/**
 * @since 2.0.0
 */
import type { Cons, Nil } from "./impl/List.js"

/**
 * @since 2.0.0
 */
export * from "./impl/List.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/List.js"

/**
 * @since 2.0.0
 */
export declare namespace List {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/List.js"
}
/**
 * Represents an immutable linked list of elements of type `A`.
 *
 * A `List` is optimal for last-in-first-out (LIFO), stack-like access patterns.
 * If you need another access pattern, for example, random access or FIFO,
 * consider using a collection more suited for that other than `List`.
 *
 * @since 2.0.0
 * @category models
 */
export type List<A> = Cons<A> | Nil<A>

/**
 * @since 2.0.0
 */
export declare namespace List {
  /**
   * @since 2.0.0
   */
  export type Infer<T extends List<any>> = T extends List<infer A> ? A : never

  /**
   * @since 2.0.0
   */
  export type With<T extends List<any>, A> = T extends Cons<any> ? Cons<A> : List<A>
}
