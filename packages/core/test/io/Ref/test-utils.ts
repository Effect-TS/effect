/**
 * @tsplus type effect/core/test/io/Ref/TestRefState
 */
export type State = Active | Changed | Closed

/**
 * @tsplus type effect/core/test/io/Ref/TestRefState.Ops
 */
export interface StateOps {}
export const State: StateOps = {}

export interface Active {
  readonly _tag: "Active"
}

export interface Changed {
  readonly _tag: "Changed"
}

export interface Closed {
  readonly _tag: "Closed"
}
/**
 * @tsplus static effect/core/test/io/Ref/TestRefState.Ops Active
 */
export const Active: State = {
  _tag: "Active"
}
/**
 * @tsplus static effect/core/test/io/Ref/TestRefState.Ops Changed
 */
export const Changed: State = {
  _tag: "Changed"
}
/**
 * @tsplus static effect/core/test/io/Ref/TestRefState.Ops Closed
 */
export const Closed: State = {
  _tag: "Closed"
}

/**
 * @tsplus fluent effect/core/test/io/Ref/TestRefState isActive
 */
export function isActive(self: State): boolean {
  return self._tag === "Active"
}

/**
 * @tsplus fluent effect/core/test/io/Ref/TestRefState isChanged
 */
export function isChanged(self: State): boolean {
  return self._tag === "Changed"
}

/**
 * @tsplus fluent effect/core/test/io/Ref/TestRefState isClosed
 */
export function isClosed(self: State): boolean {
  return self._tag === "Closed"
}
