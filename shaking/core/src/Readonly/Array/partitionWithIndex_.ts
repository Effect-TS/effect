import type { Separated } from "fp-ts/lib/Compactable"

export const partitionWithIndex_ = <A>(
  fa: ReadonlyArray<A>,
  predicateWithIndex: (i: number, a: A) => boolean
): Separated<ReadonlyArray<A>, ReadonlyArray<A>> => {
  // tslint:disable-next-line: readonly-array
  const left: Array<A> = []
  // tslint:disable-next-line: readonly-array
  const right: Array<A> = []
  for (let i = 0; i < fa.length; i++) {
    const a = fa[i]
    if (predicateWithIndex(i, a)) {
      right.push(a)
    } else {
      left.push(a)
    }
  }
  return {
    left,
    right
  }
}
