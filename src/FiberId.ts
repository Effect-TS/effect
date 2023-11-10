/**
 * @since 2.0.0
 */
import type { Composite, None, Runtime } from "./impl/FiberId.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/FiberId.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/FiberId.js"

/**
 * @since 2.0.0
 */
export declare namespace FiberId {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/FiberId.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export type FiberId = None | Runtime | Composite
