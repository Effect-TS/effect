import type { Apply, sequenceS as SS } from "fp-ts/lib/Apply"
import type { HKT } from "fp-ts/lib/HKT"

import { curried } from "./curried"

function getRecordConstructor(keys: ReadonlyArray<string>) {
  const len = keys.length
  return curried(
    (...args: ReadonlyArray<unknown>) => {
      const r: Record<string, unknown> = {}
      for (let i = 0; i < len; i++) {
        r[keys[i]] = args[i]
      }
      return r
    },
    len - 1,
    []
  )
}

export const sequenceS: typeof SS = (<F>(F: Apply<F>) => (
  r: Record<string, HKT<F, any>>
): HKT<F, Record<string, any>> => {
  const keys = Object.keys(r)
  const len = keys.length
  const f = getRecordConstructor(keys)
  let fr = F.map(r[keys[0]], f)
  for (let i = 1; i < len; i++) {
    fr = F.ap(fr, r[keys[i]])
  }
  return fr
}) as any
