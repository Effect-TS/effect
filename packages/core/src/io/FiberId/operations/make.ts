import { AtomicNumber } from "../../../support/AtomicNumber"
import type { TraceElement } from "../../TraceElement"
import type { FiberId } from "../definition"
import { RuntimeFiberId } from "../definition"

const _fiberCounter = new AtomicNumber(0)

/**
 * @tsplus static ets/FiberIdOps __call
 */
export function make(
  id: number,
  startTimeSeconds: number,
  location: TraceElement
): FiberId {
  return new RuntimeFiberId(id, startTimeSeconds, location)
}

/**
 * @tsplus static ets/FiberIdOps unsafeMake
 */
export function unsafeMake(location: TraceElement): FiberId.Runtime {
  return new RuntimeFiberId(
    _fiberCounter.getAndIncrement(),
    Math.floor(new Date().getTime() / 1000),
    location
  )
}
