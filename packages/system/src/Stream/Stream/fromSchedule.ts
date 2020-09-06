import type { HasClock } from "../../Clock"
import { map } from "../../Effect"
import { constVoid, flow } from "../../Function"
import type { Schedule } from "../../Schedule"
import { driver } from "../../Schedule"
import type { Stream } from "./definitions"
import { repeatEffectOption } from "./repeatEffectOption"
import { unwrap } from "./unwrap"

/**
 * Creates a stream from a {@link Schedule} that does not require any further
 * input. The stream will emit an element for each value output from the
 * schedule, continuing for as long as the schedule continues.
 */
export const fromSchedule: <S, R, A>(
  schedule: Schedule<S, R, unknown, A>
) => Stream<S, R & HasClock, never, A> = flow(
  driver,
  map((driver) => repeatEffectOption(driver.next(constVoid()))),
  unwrap
)
