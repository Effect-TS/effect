/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Clock.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import { effectTotal, unit } from "../Effect/core"
import type { UIO } from "../Effect/effect"
import { effectAsyncInterrupt } from "../Effect/effectAsyncInterrupt"
import { accessService, accessServiceM } from "../Effect/has"
import type { HasTag } from "../Has"
import { has } from "../Has"

//
// Clock Definition
//
export const ClockURI = Symbol()

export abstract class Clock {
  readonly _tag!: typeof ClockURI

  abstract readonly currentTime: UIO<number>
  abstract readonly sleep: (ms: number) => UIO<void>
}

//
// Has Clock
//
export const HasClock = has(Clock)

export type HasClock = HasTag<typeof HasClock>

//
// Live Clock Implementation
//
export class LiveClock extends Clock {
  currentTime: UIO<number> = effectTotal(() => new Date().getTime())

  sleep: (ms: number) => UIO<void> = (ms) =>
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
    readonly currentTime: UIO<number>,
    readonly sleep: (ms: number) => UIO<void>
  ) {
    super()
  }
}

/**
 * Get the current time in ms since epoch
 */
export const currentTime = accessServiceM(HasClock)((_) => _.currentTime)

/**
 * Sleeps for the provided amount of ms
 */
export const sleep = (ms: number) => accessServiceM(HasClock)((_) => _.sleep(ms))

/**
 * Access clock from environment
 */
export const withClockM = accessServiceM(HasClock)

/**
 * Access clock from environment
 */
export const withClock = accessService(HasClock)
