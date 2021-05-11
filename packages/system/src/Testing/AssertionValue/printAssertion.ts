import type { AssertionValue } from "./AssertionValue"

export function printAssertion(as: AssertionValue): string {
  return as.assertion.toString()
}
