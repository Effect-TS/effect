import type * as A from "../../../Array"

type RecursiveTuples<T> = readonly [T | RecursiveTuples<T>, T]

export function flattenTuples<T>([a, b]: RecursiveTuples<T>): A.Array<T> {
  if (Array.isArray(a)) {
    return [...flattenTuples(a), b]
  }

  return [a, b]
}
