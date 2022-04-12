import { constFalse } from "@tsplus/stdlib/data/Function";

export const ClockSym = Symbol.for("@effect/core/io/Clock");
export type ClockSym = typeof ClockSym;

/**
 * @tsplus type ets/Clock
 */
export interface Clock {
  readonly [ClockSym]: ClockSym;

  readonly currentTime: UIO<number>;

  readonly unsafeCurrentTime: number;

  readonly scheduler: UIO<Clock.Scheduler>;

  readonly sleep: (duration: LazyArg<Duration>, __tsplusTrace?: string) => UIO<void>;
}

/**
 * @tsplus type ets/Clock/Ops
 */
export interface ClockOps {
  $: ClockAspects;
  Scheduler: SchedulerOps;
  Tag: Tag<Clock>;
}
export const Clock: ClockOps = {
  $: {},
  Scheduler: {},
  Tag: Tag<Clock>()
};

/**
 * @tsplus type ets/Clock/Aspects
 */
export interface ClockAspects {}

/**
 * @tsplus type ets/Clock/Scheduler/Ops
 */
export interface SchedulerOps {}

export declare namespace Clock {
  export type CancelToken = Lazy<boolean>;

  /**
   * @tsplus type ets/Clock/Scheduler
   */
  export interface Scheduler {
    readonly unsafeSchedule: (task: () => void, duration: Duration) => CancelToken;
  }
}

/**
 * @tsplus static ets/Clock/Ops MAX_TIMER_MILLIS
 */
export const MAX_TIMER_MILLIS = 2 ** 31 - 1;

/**
 * @tsplus static ets/Clock/Scheduler/Ops globalScheduler
 */
export const globalScheduler: Clock.Scheduler = {
  unsafeSchedule(task: () => void, duration: Duration): Clock.CancelToken {
    // If the duration is greater than the value allowable by the JS timer
    // functions, treat the value as an infinite duration
    if (duration.millis > MAX_TIMER_MILLIS) {
      return constFalse;
    }

    let completed = false;

    const handle = setTimeout(() => {
      completed = true;
      task();
    }, duration.millis);

    return () => {
      clearTimeout(handle);
      return !completed;
    };
  }
};
