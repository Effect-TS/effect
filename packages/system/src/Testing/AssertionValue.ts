import type { Lazy } from "../Function"
import * as O from "../Option"
import * as ST from "../Structural"
import * as AM from "./AssertionM"
import * as AR from "./AssertionResult"

/**
 * An `AssertionValue` keeps track of a assertion and a value, existentially
 * hiding the type. This is used internally by the library to provide useful
 * error messages in the event of test failures.
 */
export interface AssertionValue {
  value: Lazy<any>
  expression: O.Option<string>
  sourceLocation: O.Option<string>
  assertion: AM.AssertionM<any>
  result: Lazy<AR.AssertResult>
}

export function printAssertion(as: AssertionValue): string {
  return as.assertion.toString()
}

export function label_(self: AssertionValue, l: string): AssertionValue {
  return makeAssertionValue(
    AM.label_(self.assertion, l),
    self.value,
    self.result,
    self.expression,
    self.sourceLocation
  )
}

export function label(l: string) {
  return (self: AssertionValue) => label_(self, l)
}

export function sameAssertion_(self: AssertionValue, that: AssertionValue): boolean {
  return ST.equals(self.assertion, that.assertion)
}

export function sameAssertion(that: AssertionValue) {
  return (self: AssertionValue) => sameAssertion_(self, that)
}

export function negate(self: AssertionValue): AssertionValue {
  return makeAssertionValue(
    AM.not(self.assertion),
    self.value,
    () => AR.not(self.result()),
    self.expression,
    self.sourceLocation
  )
}

export function makeAssertionValue<A>(
  assertion: AM.AssertionM<A>,
  value: Lazy<A>,
  result: Lazy<AR.AssertResult>,
  expression: O.Option<string> = O.none,
  sourceLocation: O.Option<string> = O.none
): AssertionValue {
  return {
    value,
    expression,
    sourceLocation,
    assertion,
    result
  }
}

export function withContext_(
  self: AssertionValue,
  expr: O.Option<string>,
  sourceLocation: O.Option<string>
): AssertionValue {
  return makeAssertionValue(
    self.assertion,
    self.value,
    self.result,
    expr,
    sourceLocation
  )
}

export function withContext(expr: O.Option<string>, sourceLocation: O.Option<string>) {
  return (self: AssertionValue) => withContext_(self, expr, sourceLocation)
}
