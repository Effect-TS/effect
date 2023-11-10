/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/Ordering.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/Ordering.js"

/**
 * @since 2.0.0
 */
export declare namespace Ordering {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Ordering.js"
}
/**
 * @category model
 * @since 2.0.0
 */
export type Ordering = -1 | 0 | 1
