import type { Separated } from "fp-ts/lib/Compactable"

import { Either, isLeft } from "../../Either"

import type { Next } from "./Next"

export const partitionMapWithIndex_ = <K, A, B, C>(
  fa: ReadonlyMap<K, A>,
  f: (k: K, a: A) => Either<B, C>
): Separated<ReadonlyMap<K, B>, ReadonlyMap<K, C>> => {
  const left = new Map<K, B>()
  const right = new Map<K, C>()
  const entries = fa.entries()
  let e: Next<readonly [K, A]>
  // tslint:disable-next-line: strict-boolean-expressions
  while (!(e = entries.next()).done) {
    const [k, a] = e.value
    const ei = f(k, a)
    if (isLeft(ei)) {
      left.set(k, ei.left)
    } else {
      right.set(k, ei.right)
    }
  }
  return {
    left,
    right
  }
}
