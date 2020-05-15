import { isSome, Option } from "../../Option"

import type { ReadonlyRecord } from "./ReadonlyRecord"

export const compact = <A>(
  fa: ReadonlyRecord<string, Option<A>>
): ReadonlyRecord<string, A> => {
  const r: Record<string, A> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    const optionA = fa[key]
    if (isSome(optionA)) {
      r[key] = optionA.value
    }
  }
  return r
}
