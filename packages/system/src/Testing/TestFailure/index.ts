// ets_tracing: off

import * as C from "../../Cause/index.js"
import * as T from "../../Effect/index.js"
import type * as TR from "../TestResult/index.js"

export const AssertionTypeId = Symbol()

export class Assertion {
  readonly _typeId: typeof AssertionTypeId = AssertionTypeId

  constructor(readonly result: TR.TestResult) {}
}

export const RuntimeTypeId = Symbol()

export class Runtime<E> {
  readonly [T._E]: () => E

  readonly _typeId: typeof RuntimeTypeId = RuntimeTypeId

  constructor(readonly cause: C.Cause<E>) {}
}

export type TestFailure<E> = Assertion | Runtime<E>

/**
 * Constructs an assertion failure with the specified result.
 */
export function assertion(result: TR.TestResult): TestFailure<never> {
  return new Assertion(result)
}

/**
 * Constructs a runtime failure that dies with the specified `Throwable`.
 */
export function die(e: unknown): TestFailure<never> {
  return halt(C.die(e))
}

/**
 * Constructs a runtime failure that fails with the specified error.
 */
export function fail<E>(e: E): TestFailure<E> {
  return halt(C.fail(e))
}

/**
 * Constructs a runtime failure with the specified cause.
 */
export function halt<E>(cause: C.Cause<E>): TestFailure<E> {
  return new Runtime(cause)
}
