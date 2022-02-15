import { AtomicNumber } from "../../../support/AtomicNumber"
import type { FiberId } from "../definition"
import { Runtime } from "../definition"

const _fiberCounter = new AtomicNumber(0)

/**
 * @tsplus static ets/FiberIdOps __call
 */
export function make(id: number, startTimeSeconds: number): FiberId {
  return new Runtime(id, startTimeSeconds)
}

/**
 * @tsplus static ets/FiberIdOps unsafeMake
 */
export function unsafeMake(): Runtime {
  return new Runtime(
    _fiberCounter.getAndIncrement(),
    Math.floor(new Date().getTime() / 1000)
  )
}
