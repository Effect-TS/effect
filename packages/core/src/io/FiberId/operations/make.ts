import { RuntimeFiberId } from "@effect/core/io/FiberId/definition"
import { pipe } from "@fp-ts/data/Function"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"

const _fiberCounter = MutableRef.make(0)

/**
 * @tsplus static effect/core/io/FiberId.Ops __call
 * @category constructors
 * @since 1.0.0
 */
export function make(id: number, startTimeSeconds: number): FiberId {
  return new RuntimeFiberId(id, startTimeSeconds)
}

/**
 * @tsplus static effect/core/io/FiberId.Ops unsafeMake
 * @category constructors
 * @since 1.0.0
 */
export function unsafeMake(): FiberId.Runtime {
  const id = MutableRef.get(_fiberCounter)
  pipe(_fiberCounter, MutableRef.set(id + 1))
  return new RuntimeFiberId(id, new Date().getTime())
}
