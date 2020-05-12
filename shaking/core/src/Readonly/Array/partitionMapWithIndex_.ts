import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../../Either/Either"

export const partitionMapWithIndex_ = <A, B, C>(
  fa: ReadonlyArray<A>,
  f: (i: number, a: A) => Either<B, C>
): Separated<ReadonlyArray<B>, ReadonlyArray<C>> => {
  // tslint:disable-next-line: readonly-array
  const left: Array<B> = []
  // tslint:disable-next-line: readonly-array
  const right: Array<C> = []
  for (let i = 0; i < fa.length; i++) {
    const e = f(i, fa[i])
    if (e._tag === "Left") {
      left.push(e.left)
    } else {
      right.push(e.right)
    }
  }
  return {
    left,
    right
  }
}
