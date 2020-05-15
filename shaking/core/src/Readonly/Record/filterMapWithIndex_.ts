import { isSome, Option } from "../../Option"

import type { ReadonlyRecord } from "./ReadonlyRecord"

export const filterMapWithIndex_ = <A, B>(
  fa: ReadonlyRecord<string, A>,
  f: (key: string, a: A) => Option<B>
) => {
  const r: Record<string, B> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    const optionB = f(key, fa[key])
    if (isSome(optionB)) {
      r[key] = optionB.value
    }
  }
  return r
}
