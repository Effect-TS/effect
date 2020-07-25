import { Async, Sync } from "../Effect/effect"
import { effectAsyncInterrupt } from "../Effect/effectAsyncInterrupt"
import { effectTotal } from "../Effect/effectTotal"
import { unit } from "../Effect/unit"
import { accessServiceM, has, accessService, HasType } from "../Has"

//
// Clock Definition
//
export const ClockURI = Symbol()

export abstract class Clock {
  readonly _tag!: typeof ClockURI

  abstract readonly currentTime: Sync<number>
  abstract readonly sleep: (ms: number) => Async<void>
}

//
// Has Clock
//
export const HasClock =
  
  has(Clock)

export type HasClock = HasType<typeof HasClock>

//
// Live Clock Implementation
//
export class LiveClock extends Clock {
  currentTime: Sync<number> = effectTotal(() => new Date().getTime())

  sleep: (ms: number) => Async<void> = (ms) =>
    effectAsyncInterrupt((cb) => {
      const timeout = setTimeout(() => {
        cb(unit)
      }, ms)

      return effectTotal(() => {
        clearTimeout(timeout)
      })
    })
}

//
// Proxy Clock Implementation
//
export class ProxyClock extends Clock {
  constructor(
    readonly currentTime: Sync<number>,
    readonly sleep: (ms: number) => Async<void>
  ) {
    super()
  }
}

/**
 * Get the current time in ms since epoch
 */
export const currentTime =
  
  accessServiceM(HasClock)((_) => _.currentTime)

/**
 * Sleeps for the provided amount of ms
 */
export const sleep = (ms: number) => accessServiceM(HasClock)((_) => _.sleep(ms))

/**
 * Access clock from environment
 */
export const withClockM =
  
  accessServiceM(HasClock)

/**
 * Access clock from environment
 */
export const withClock =
  
  accessService(HasClock)
