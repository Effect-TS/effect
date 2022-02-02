import type { Has } from "../../data/Has"
import { tag } from "../../data/Has"
import type { UIO } from "../Effect"
import { Effect } from "../Effect"

export const ClockId: unique symbol = Symbol.for("@effect-ts/system/io/Clock")

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
  abstract readonly sleep: (ms: number, __etsTrace?: string) => UIO<void>
}

/**
 * Get the current time in milliseconds since the UNIX epoch.
 */
export const currentTime: Effect<HasClock, never, number> = Effect.serviceWithEffect(
  HasClock
)((_) => _.currentTime)

/**
 * Sleeps for the provided number of milliseconds.
 */
export function sleep(ms: number, __etsTrace?: string): Effect<HasClock, never, void> {
  return Effect.serviceWithEffect(HasClock)((_) => _.sleep(ms))
}

/**
 * Access clock from environment
 */
export const withClockEffect = Effect.serviceWithEffect(HasClock)

/**
 * Access clock from environment
 */
export const withClock = Effect.serviceWith(HasClock)
