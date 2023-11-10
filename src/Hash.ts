/**
 * @since 2.0.0
 */
import { symbol } from "./impl/Hash.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/Hash.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/Hash.js"

/**
 * @since 2.0.0
 */
export declare namespace Hash {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Hash.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface Hash {
  [symbol](): number
}
