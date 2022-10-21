import { RuntimeFiberId } from "@effect/core/io/FiberId/definition"

const _fiberCounter = new AtomicNumber(0)

/**
 * @tsplus static effect/core/io/FiberId.Ops __call
 */
export function make(id: number, startTimeSeconds: number): FiberId {
  return new RuntimeFiberId(id, startTimeSeconds)
}

/**
 * @tsplus static effect/core/io/FiberId.Ops unsafeMake
 */
export function unsafeMake(): FiberId.Runtime {
  return new RuntimeFiberId(
    _fiberCounter.getAndIncrement(),
    new Date().getTime()
  )
}
