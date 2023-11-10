/**
 * A data type for immutable linked lists representing ordered collections of elements of type `A`.
 *
 * This data type is optimal for last-in-first-out (LIFO), stack-like access patterns. If you need another access pattern, for example, random access or FIFO, consider using a collection more suited to this than `List`.
 *
 * **Performance**
 *
 * - Time: `List` has `O(1)` prepend and head/tail access. Most other operations are `O(n)` on the number of elements in the list. This includes the index-based lookup of elements, `length`, `append` and `reverse`.
 * - Space: `List` implements structural sharing of the tail list. This means that many operations are either zero- or constant-memory cost.
 *
 * @since 2.0.0
 */

/**
 * @since 2.0.0
 * @internal
 */
import type { Cons, Nil } from "./impl/List.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/List.js"
/**
 * @since 2.0.0
 * @internal
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
