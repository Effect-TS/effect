import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../../Either/Either"

export const separate_ = <B, C>(
  fa: ReadonlyArray<Either<B, C>>
): Separated<ReadonlyArray<B>, ReadonlyArray<C>> => {
  // tslint:disable-next-line: readonly-array
  const left: Array<B> = []
  // tslint:disable-next-line: readonly-array
  const right: Array<C> = []
  for (const e of fa) {
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
