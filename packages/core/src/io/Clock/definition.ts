import { Tag } from "@fp-ts/data/Context"
import type { Duration } from "@fp-ts/data/Duration"
import { constFalse } from "@fp-ts/data/Function"

export const ClockSym = Symbol.for("@effect/core/io/Clock")
export type ClockSym = typeof ClockSym

/**
 * @tsplus type effect/core/io/Clock
 * @category model
 * @since 1.0.0
 */
export interface Clock {
  readonly [ClockSym]: ClockSym

  readonly currentTime: Effect<never, never, number>

  readonly unsafeCurrentTime: number

  readonly scheduler: Effect<never, never, Clock.Scheduler>

  readonly sleep: (duration: Duration) => Effect<never, never, void>
}

/**
 * @tsplus type effect/core/io/Clock.Ops
 * @category model
 * @since 1.0.0
 */
export interface ClockOps {
  Scheduler: SchedulerOps
  Tag: Tag<Clock>
}
export const Clock: ClockOps = {
  Scheduler: {},
  Tag: Tag<Clock>()
}

/**
 * @tsplus type effect/core/io/Clock.Aspects
 * @category model
 * @since 1.0.0
 */
export interface ClockAspects {}

/**
 * @tsplus type effect/core/io/Clock/Scheduler.Ops
 * @category model
 * @since 1.0.0
 */
export interface SchedulerOps {}

/**
 * @since 1.0.0
 */
export declare namespace Clock {
  /**
   * @category model
   * @since 1.0.0
   */
  export type CancelToken = () => boolean

  /**
   * @tsplus type effect/core/io/Clock/Scheduler
   * @category model
   * @since 1.0.0
   */
  export interface Scheduler {
    readonly unsafeSchedule: (task: () => void, duration: Duration) => CancelToken
  }
}

/**
 * @tsplus static effect/core/io/Clock.Ops MAX_TIMER_MILLIS
 * @category constants
 * @since 1.0.0
 */
export const MAX_TIMER_MILLIS = 2 ** 31 - 1

/**
 * @tsplus static effect/core/io/Clock/Scheduler.Ops globalScheduler
 * @category constructors
 * @since 1.0.0
 */
export const globalScheduler: Clock.Scheduler = {
  unsafeSchedule(task: () => void, duration: Duration): Clock.CancelToken {
    // If the duration is greater than the value allowable by the JS timer
    // functions, treat the value as an infinite duration
    if (duration.millis > MAX_TIMER_MILLIS) {
      return constFalse
    }

    let completed = false

    const handle = setTimeout(() => {
      completed = true
      task()
    }, duration.millis)

    return () => {
      clearTimeout(handle)
      return !completed
    }
  }
}
