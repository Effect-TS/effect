/**
 * @tsplus type ets/TestSynchronizedRefState
 */
export type State = Active | Changed | Closed;

/**
 * @tsplus type ets/TestSynchronizedRefState/Ops
 */
export interface StateOps {}
export const State: StateOps = {};

export interface Active {
  readonly _tag: "Active";
}

export interface Changed {
  readonly _tag: "Changed";
}

export interface Closed {
  readonly _tag: "Closed";
}

/**
 * @tsplus static ets/TestSynchronizedRefState/Ops Active
 */
export const Active: State = {
  _tag: "Active"
};

/**
 * @tsplus static ets/TestSynchronizedRefState/Ops Changed
 */
export const Changed: State = {
  _tag: "Changed"
};

/**
 * @tsplus static ets/TestSynchronizedRefState/Ops Closed
 */
export const Closed: State = {
  _tag: "Closed"
};

/**
 * @tsplus fluent ets/TestSynchronizedRefState isActive
 */
export function isActive(self: State): boolean {
  return self._tag === "Active";
}

/**
 * @tsplus fluent ets/TestSynchronizedRefState isChanged
 */
export function isChanged(self: State): boolean {
  return self._tag === "Changed";
}

/**
 * @tsplus fluent ets/TestSynchronizedRefState isClosed
 */
export function isClosed(self: State): boolean {
  return self._tag === "Closed";
}
