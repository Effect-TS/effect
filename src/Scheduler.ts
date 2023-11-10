/**
 * @since 2.0.0
 */
import type { RuntimeFiber } from "./impl/Fiber.js"
import type { Task } from "./impl/Scheduler.js"

/**
 * @since 2.0.0
 */
export * from "./impl/Scheduler.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/Scheduler.js"

/**
 * @since 2.0.0
 */
export declare namespace Scheduler {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Scheduler.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface Scheduler {
  shouldYield(fiber: RuntimeFiber<unknown, unknown>): number | false
  scheduleTask(task: Task, priority: number): void
}
