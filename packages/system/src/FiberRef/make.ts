// ets_tracing: off

import type { UIO } from "../Effect/effect.js"
import { IFiberRefNew } from "../Effect/primitives.js"
import { identity } from "../Function/index.js"
import { Runtime } from "./fiberRef.js"

/**
 * Creates a new `FiberRef` with given initial value.
 */
export function make<A>(
  initial: A,
  onFork: (a: A) => A = identity,
  onJoin: (a: A, a2: A) => A = (_, a) => a
): UIO<Runtime<A>> {
  return new IFiberRefNew(initial, onFork, onJoin)
}

/**
 * Creates a new `FiberRef` with given initial value.
 */
export function unsafeMake<A>(
  initial: A,
  onFork: (a: A) => A = identity,
  onJoin: (a: A, a2: A) => A = (_, a) => a
): Runtime<A> {
  return new Runtime(initial, onFork, onJoin)
}
