import "../Operator"

/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Clock.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import { effectTotal, unit } from "../Effect/core"
import type { UIO } from "../Effect/effect"
import { effectAsyncInterrupt } from "../Effect/effectAsyncInterrupt"
import { accessService, accessServiceM } from "../Effect/has"
import { literal } from "../Function"
import type { HasTag } from "../Has"
import { tag } from "../Has"
import type { UIO as SyncUIO } from "../Sync/core"
import { sync } from "../Sync/core"
import { accessServiceM as accessServiceMSync } from "../Sync/has"

//
// Clock Definition
//
export abstract class Clock {
  readonly _tag = literal("@effect-ts/system/Clock")

  abstract readonly currentTime: SyncUIO<number>
  abstract readonly sleep: (ms: number) => UIO<void>
}

//
// Has Clock
//
export const HasClock = tag(Clock)

export type HasClock = HasTag<typeof HasClock>

//
// Live Clock Implementation
//
export class LiveClock extends Clock {
  currentTime: SyncUIO<number> = sync(() => new Date().getTime())

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
    readonly currentTime: SyncUIO<number>,
    readonly sleep: (ms: number) => UIO<void>
  ) {
    super()
  }
}

/**
 * Get the current time in ms since epoch
 */
export const currentTime = accessServiceMSync(HasClock)((_) => _.currentTime)

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
