import { Option, isSome } from "../../Option"

import type { Next } from "./Next"

export const compact = <K, A>(fa: ReadonlyMap<K, Option<A>>): ReadonlyMap<K, A> => {
  const m = new Map<K, A>()
  const entries = fa.entries()
  let e: Next<readonly [K, Option<A>]>
  while (!(e = entries.next()).done) {
    const [k, oa] = e.value
    if (isSome(oa)) {
      m.set(k, oa.value)
    }
  }
  return m
}
