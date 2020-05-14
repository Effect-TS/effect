import { Next } from "./Next"

export const mapWithIndex_ = <K, A, B>(
  fa: ReadonlyMap<K, A>,
  f: (k: K, a: A) => B
): ReadonlyMap<K, B> => {
  const m = new Map<K, B>()
  const entries = fa.entries()
  let e: Next<readonly [K, A]>
  while (!(e = entries.next()).done) {
    const [key, a] = e.value
    m.set(key, f(key, a))
  }
  return m
}
