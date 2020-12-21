import type * as A from "../../../Array"

type RecursiveTuples<T> = readonly [T | RecursiveTuples<T>, T]

function isTuple(t: unknown): t is readonly [unknown, unknown] {
  return Array.isArray(t) && t.length === 2
}

export function flattenTuples<T>([a, b]: RecursiveTuples<T>): A.Array<T> {
  if (isTuple(a)) {
    return [...flattenTuples(a), b]
  }

  return [a, b]
}
