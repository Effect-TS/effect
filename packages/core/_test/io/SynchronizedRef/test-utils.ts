/**
 * @tsplus type effect/core/test/io/SynchronizedRef/TestSynchronizedRef
 */
export type State = Active | Changed | Closed

/**
 * @tsplus type effect/core/test/io/SynchronizedRef/TestSynchronizedRef.Ops
 */
export interface StateOps {}
export const State: StateOps = {}

/**
 * @tsplus type effect/core/test/io/SynchronizedRef/TestSynchronizedRef/Active
 */
export class Active {
  readonly _tag = "Active"
}

/**
 * @tsplus type effect/core/test/io/SynchronizedRef/TestSynchronizedRef/Changed
 */
export class Changed {
  readonly _tag = "Changed"
}

/**
 * @tsplus type effect/core/test/io/SynchronizedRef/TestSynchronizedRef/Closed
 */
export class Closed {
  readonly _tag = "Closed"
}

/**
 * @tsplus static effect/core/test/io/SynchronizedRef/TestSynchronizedRef.Ops Active
 */
export const active: State = new Active()

/**
 * @tsplus static effect/core/test/io/SynchronizedRef/TestSynchronizedRef.Ops Changed
 */
export const changed: State = new Changed()

/**
 * @tsplus static effect/core/test/io/SynchronizedRef/TestSynchronizedRef.Ops Closed
 */
export const closed: State = new Closed()

/**
 * @tsplus fluent effect/core/test/io/SynchronizedRef/TestSynchronizedRef isActive
 */
export function isActive(self: State): boolean {
  return self._tag === "Active"
}

/**
 * @tsplus fluent effect/core/test/io/SynchronizedRef/TestSynchronizedRef isChanged
 */
export function isChanged(self: State): boolean {
  return self._tag === "Changed"
}

/**
 * @tsplus fluent effect/core/test/io/SynchronizedRef/TestSynchronizedRef isClosed
 */
export function isClosed(self: State): boolean {
  return self._tag === "Closed"
}
