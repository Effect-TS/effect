/**
 * @since 2.0.0
 */
export * from "./impl/Order.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/Order.js"

/**
 * @since 2.0.0
 */
export declare namespace Order {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Order.js"
}
/**
 * @category type class
 * @since 2.0.0
 */
export interface Order<A> {
  (self: A, that: A): -1 | 0 | 1
}
