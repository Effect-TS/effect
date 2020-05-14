import { Next } from "./Next"

export const filterWithIndex_ = <K, A>(
  fa: ReadonlyMap<K, A>,
  p: (k: K, a: A) => boolean
): ReadonlyMap<K, A> => {
  const m = new Map<K, A>()
  const entries = fa.entries()
  let e: Next<readonly [K, A]>
  // tslint:disable-next-line: strict-boolean-expressions
  while (!(e = entries.next()).done) {
    const [k, a] = e.value
    if (p(k, a)) {
      m.set(k, a)
    }
  }
  return m
}
