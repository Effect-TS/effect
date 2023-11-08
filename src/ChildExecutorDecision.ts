import type { ChildExecutorDecisionTypeId, Close, Yield } from "./ChildExecutorDecision.impl.js"
import type { Continue } from "./ScheduleDecision.js"

export * from "./ChildExecutorDecision.impl.js"
export * from "./internal/Jumpers/ChildExecutorDecision.js"

/**
 * @since 2.0.0
 * @category models
 */
export type ChildExecutorDecision = Continue | Close | Yield

/**
 * @since 2.0.0
 */
export declare namespace ChildExecutorDecision {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Proto {
    readonly [ChildExecutorDecisionTypeId]: ChildExecutorDecisionTypeId
  }

  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./ChildExecutorDecision.impl.js"
}
