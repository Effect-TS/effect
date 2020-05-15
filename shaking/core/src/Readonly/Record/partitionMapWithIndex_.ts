import type { Either } from "../../Either"

import type { ReadonlyRecord } from "./ReadonlyRecord"

export const partitionMapWithIndex_ = <A, B, C>(
  fa: ReadonlyRecord<string, A>,
  f: (key: string, a: A) => Either<B, C>
) => {
  const left: Record<string, B> = {}
  const right: Record<string, C> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    const e = f(key, fa[key])
    switch (e._tag) {
      case "Left":
        left[key] = e.left
        break
      case "Right":
        right[key] = e.right
        break
    }
  }
  return {
    left,
    right
  }
}
