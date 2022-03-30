import { Duration } from "../../../src/data/Duration"
import type { HasClock } from "../../../src/io/Clock"
import { Clock } from "../../../src/io/Clock"
import type { RIO, UIO } from "../../../src/io/Effect"
import type { Queue } from "../../../src/io/Queue"

export function waitForValue<A>(ref: UIO<A>, value: A): RIO<HasClock, A> {
  return (ref < Clock.sleep(Duration(10))).repeatUntil((a) => value === a)
}

export function waitForSize<A>(queue: Queue<A>, size: number): RIO<HasClock, number> {
  return waitForValue(queue.size, size)
}
