import type { Done, Running, Suspended } from "./impl/FiberStatus.js"

export * from "./impl/FiberStatus.js"
export * from "./internal/Jumpers/FiberStatus.js"

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
