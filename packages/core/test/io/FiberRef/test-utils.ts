import { Duration } from "../../../src/data/Duration"
import type { HasClock } from "../../../src/io/Clock"
import { Clock } from "../../../src/io/Clock"
import { Effect } from "../../../src/io/Effect"

export const loseTimeAndCpu: Effect<HasClock, never, void> = (
  Effect.yieldNow < Clock.sleep(Duration(1))
).repeatN(100)
