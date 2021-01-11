import type { Trace } from "../Fiber"
import type { FiberID } from "../Fiber/id"
import * as O from "../Option"
import * as L from "../Persistent/List"

/**
 * Cause is a Free Semiring structure that allows tracking of multiple error causes.
 */
export type Cause<E> = Empty | Fail<E> | Die | Interrupt | Then<E> | Both<E> | Traced<E>

export interface Empty {
  readonly _tag: "Empty"
}

export interface Fail<E> {
  readonly _tag: "Fail"
  readonly value: E
}

export interface Die {
  readonly _tag: "Die"
  readonly value: unknown
}

export interface Interrupt {
  readonly _tag: "Interrupt"
  readonly fiberId: FiberID
}

export interface Traced<E> {
  readonly _tag: "Traced"
  readonly cause: Cause<E>
  readonly trace: Trace
}

export interface Then<E> {
  readonly _tag: "Then"
  readonly left: Cause<E>
  readonly right: Cause<E>
}

export interface Both<E> {
  readonly _tag: "Both"
  readonly left: Cause<E>
  readonly right: Cause<E>
}

export const empty: Cause<never> = {
  _tag: "Empty"
}

export function fail<E>(value: E): Cause<E> {
  return {
    _tag: "Fail",
    value
  }
}

export function traced<E>(cause: Cause<E>, trace: Trace): Cause<E> {
  if (
    L.isEmpty(trace.executionTrace) &&
    L.isEmpty(trace.stackTrace) &&
    O.isNone(trace.parentTrace)
  ) {
    return cause
  }
  return {
    _tag: "Traced",
    cause,
    trace
  }
}

export function die(value: unknown): Cause<never> {
  return {
    _tag: "Die",
    value
  }
}

export function interrupt(fiberId: FiberID): Cause<never> {
  return {
    _tag: "Interrupt",
    fiberId
  }
}

export function then<E1, E2>(left: Cause<E1>, right: Cause<E2>): Cause<E1 | E2> {
  return left === empty
    ? right
    : right === empty
    ? left
    : {
        _tag: "Then",
        left,
        right
      }
}

export function both<E1, E2>(left: Cause<E1>, right: Cause<E2>): Cause<E1 | E2> {
  return left === empty
    ? right
    : right === empty
    ? left
    : {
        _tag: "Both",
        left,
        right
      }
}
