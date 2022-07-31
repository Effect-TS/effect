import { constFalse } from "@tsplus/stdlib/data/Function"

export const ClockSym = Symbol.for("@effect/core/io/Clock")
export type ClockSym = typeof ClockSym

/**
 * @tsplus type effect/core/io/Clock
 */
export interface Clock {
  readonly [ClockSym]: ClockSym

  readonly currentTime: Effect<never, never, number>

  readonly unsafeCurrentTime: number

  readonly scheduler: Effect<never, never, Clock.Scheduler>

  readonly sleep: (duration: LazyArg<Duration>) => Effect<never, never, void>
}

/**
 * @tsplus type effect/core/io/Clock.Ops
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
 */
export interface ClockAspects {}

/**
 * @tsplus type effect/core/io/Clock/Scheduler.Ops
 */
export interface SchedulerOps {}

export declare namespace Clock {
  export type CancelToken = Lazy<boolean>

  /**
   * @tsplus type effect/core/io/Clock/Scheduler
   */
  export interface Scheduler {
    readonly unsafeSchedule: (task: () => void, duration: Duration) => CancelToken
  }
}

/**
 * @tsplus static effect/core/io/Clock.Ops MAX_TIMER_MILLIS
 */
export const MAX_TIMER_MILLIS = 2 ** 31 - 1

/**
 * @tsplus static effect/core/io/Clock/Scheduler.Ops globalScheduler
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
