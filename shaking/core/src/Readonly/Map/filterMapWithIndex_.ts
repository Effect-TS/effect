import { Option, isSome } from "../../Option"

import { Next } from "./Next"

export const filterMapWithIndex_ = <K, A, B>(
  fa: ReadonlyMap<K, A>,
  f: (k: K, a: A) => Option<B>
): ReadonlyMap<K, B> => {
  const m = new Map<K, B>()
  const entries = fa.entries()
  let e: Next<readonly [K, A]>
  // tslint:disable-next-line: strict-boolean-expressions
  while (!(e = entries.next()).done) {
    const [k, a] = e.value
    const o = f(k, a)
    if (isSome(o)) {
      m.set(k, o.value)
    }
  }
  return m
}
