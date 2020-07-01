import * as A from "../../Array"
import { Either } from "../../Either"
import { HasClock } from "../Clock"

import { andThen_ } from "./andThen_"
import { as } from "./as"
import { fromDelays } from "./fromDelays"
import { recurs } from "./recurs"
import { Schedule } from "./schedule"

/**
 * A schedule that recurs once with the specified delay.
 */
export const fromDuration = (ms: number) => fromDelays(as(ms)(recurs(1)))

/**
 * A schedule that recurs once for each of the specified durations, delaying
 * each time for the length of the specified duration. Returns the length of
 * the current duration between recurrences.
 */
export function fromDurations(
  ms0: number,
  ms1: number,
  ms2: number,
  ms3: number,
  ms4: number
): Schedule<
  unknown,
  HasClock,
  Either<number, Either<number, Either<number, Either<number, number>>>>,
  unknown,
  number
>
export function fromDurations(
  ms0: number,
  ms1: number,
  ms2: number,
  ms3: number
): Schedule<
  unknown,
  HasClock,
  Either<number, Either<number, Either<number, number>>>,
  unknown,
  number
>
export function fromDurations(
  ms0: number,
  ms1: number,
  ms2: number
): Schedule<unknown, HasClock, Either<number, Either<number, number>>, unknown, number>
export function fromDurations(
  ms0: number,
  ms1: number
): Schedule<unknown, HasClock, Either<number, number>, unknown, number>
export function fromDurations(
  ...ms: number[]
): Schedule<unknown, HasClock, any, unknown, number> {
  return A.map_(ms, fromDuration).reduce((s, d) => andThen_(s, d) as any)
}
