/**
 * @tsplus type ets/TestSynchronizedRef/State
 */
export type State = Active | Changed | Closed

/**
 * @tsplus type ets/TestSynchronizedRef/State/Ops
 */
export interface StateOps {}
export const State: StateOps = {}

/**
 * @tsplus type ets/TestSynchronizedRef/State/Active
 */
export class Active {
  readonly _tag = "Active"
}

/**
 * @tsplus type ets/TestSynchronizedRef/State/Changed
 */
export class Changed {
  readonly _tag = "Changed"
}

/**
 * @tsplus type ets/TestSynchronizedRef/State/Closed
 */
export class Closed {
  readonly _tag = "Closed"
}

/**
 * @tsplus static ets/TestSynchronizedRef/State/Ops Active
 */
export const active: State = new Active()

/**
 * @tsplus static ets/TestSynchronizedRef/State/Ops Changed
 */
export const changed: State = new Changed()

/**
 * @tsplus static ets/TestSynchronizedRef/State/Ops Closed
 */
export const closed: State = new Closed()

/**
 * @tsplus fluent ets/TestSynchronizedRef/State isActive
 */
export function isActive(self: State): boolean {
  return self._tag === "Active"
}

/**
 * @tsplus fluent ets/TestSynchronizedRef/State isChanged
 */
export function isChanged(self: State): boolean {
  return self._tag === "Changed"
}

/**
 * @tsplus fluent ets/TestSynchronizedRef/State isClosed
 */
export function isClosed(self: State): boolean {
  return self._tag === "Closed"
}
