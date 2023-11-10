/**
 * @since 2.0.0
 */
import type { Hash } from "./Hash.js"
import { symbol } from "./impl/Equal.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/Equal.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/Equal.js"

/**
 * @since 2.0.0
 */
export declare namespace Equal {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Equal.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface Equal extends Hash {
  [symbol](that: Equal): boolean
}
