import type * as A from "../../../Array"

type RecursiveTuples<T> = readonly [T | RecursiveTuples<T>, T]

function isTuple(t: unknown): t is readonly [unknown, unknown] {
  return Array.isArray(t) && t.length === 2
}

export function flattenTuples<T>(tuples: RecursiveTuples<T>): A.Array<T> {
  const result: T[] = []
  let [a, b] = tuples

  for (;;) {
    if (isTuple(a)) {
      result.unshift(b)
      ;[a, b] = a
    } else {
      result.unshift(a, b)
      break
    }
  }

  return result
}
