/**
 * @since 2.0.0
 */
import type { Done, Running, Suspended } from "./impl/FiberStatus.js"

/**
 * @since 2.0.0
 */
export * from "./impl/FiberStatus.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/FiberStatus.js"

/**
 * @since 2.0.0
 */
export declare namespace FiberStatus {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/FiberStatus.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export type FiberStatus = Done | Running | Suspended
