/**
 * @since 2.0.0
 */
import type { Continue, Done } from "./impl/ScheduleDecision.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/ScheduleDecision.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/ScheduleDecision.js"

/**
 * @since 2.0.0
 */
export declare namespace ScheduleDecision {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/ScheduleDecision.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export type ScheduleDecision = Continue | Done
