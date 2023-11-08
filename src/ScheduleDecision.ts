import type { Continue, Done } from "./ScheduleDecision.impl.js"

export * from "./internal/Jumpers/ScheduleDecision.js"
export * from "./ScheduleDecision.impl.js"

export declare namespace ScheduleDecision {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./ScheduleDecision.impl.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export type ScheduleDecision = Continue | Done
