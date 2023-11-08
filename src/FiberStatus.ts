import type { Done, Running, Suspended } from "./FiberStatus.impl.js"

export * from "./FiberStatus.impl.js"
export * from "./internal/Jumpers/FiberStatus.js"

export declare namespace FiberStatus {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./FiberStatus.impl.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export type FiberStatus = Done | Running | Suspended
