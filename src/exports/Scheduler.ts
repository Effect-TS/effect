import type { RuntimeFiber } from "../Fiber.js"
import type { Task } from "../Scheduler.js"

export * from "../internal/Jumpers/Scheduler.js"
export * from "../Scheduler.js"

export declare namespace Scheduler {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../Scheduler.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface Scheduler {
  shouldYield(fiber: RuntimeFiber<unknown, unknown>): number | false
  scheduleTask(task: Task, priority: number): void
}
