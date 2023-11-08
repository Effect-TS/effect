export * from "./internal/Jumpers/Ordering.js"
export * from "./Ordering.impl.js"

export declare namespace Ordering {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./Ordering.impl.js"
}
/**
 * @category model
 * @since 2.0.0
 */
export type Ordering = -1 | 0 | 1
