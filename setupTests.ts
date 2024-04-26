import { equals } from "@vitest/expect"
import { expect } from "vitest"

// workaround for https://github.com/vitest-dev/vitest/issues/5620

function hasIterator(object: any) {
  return !!(object !== null && object[Symbol.iterator])
}

expect.addEqualityTesters([(a: unknown, b: unknown) => {
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    Array.isArray(a) ||
    Array.isArray(b) ||
    !hasIterator(a) ||
    !hasIterator(b) ||
    a === null ||
    b === null
  ) {
    return undefined
  }

  const aEntries = Object.entries(a)
  const bEntries = Object.entries(b)

  if (!equals(aEntries, bEntries)) return false

  return undefined
}])
