// ets_tracing: off

import type { Effect, UIO } from "../Effect/definition"
import { serviceWith } from "../Effect/operations/serviceWith"
import { serviceWithEffect } from "../Effect/operations/serviceWithEffect"
import type { Has } from "../Has"
import { tag } from "../Has"

export const ClockId: unique symbol = Symbol.for("@effect-ts/system/Clock")

export type ClockId = typeof ClockId

export const HasClock = tag<Clock>(ClockId)

export type HasClock = Has<Clock>

export abstract class Clock {
  readonly [ClockId]: ClockId = ClockId
  /**
   * Get the current time in milliseconds since the UNIX epoch.
   */
  abstract readonly currentTime: UIO<number>
  /**
   * Sleeps for the provided number of milliseconds.
   */
  abstract readonly sleep: (ms: number, __trace?: string) => UIO<void>
}

/**
 * Get the current time in milliseconds since the UNIX epoch.
 */
export const currentTime: Effect<HasClock, never, number> = serviceWithEffect(HasClock)(
  (_) => _.currentTime
)

/**
 * Sleeps for the provided number of milliseconds.
 */
export function sleep(ms: number, __trace?: string): Effect<HasClock, never, void> {
  return serviceWithEffect(HasClock)((_) => _.sleep(ms, __trace))
}

/**
 * Access clock from environment
 */
export const withClockEffect = serviceWithEffect(HasClock)

/**
 * Access clock from environment
 */
export const withClock = serviceWith(HasClock)
