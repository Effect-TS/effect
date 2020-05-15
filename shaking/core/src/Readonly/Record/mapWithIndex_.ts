import type { ReadonlyRecord } from "./ReadonlyRecord"

export const mapWithIndex_ = <A, B>(
  fa: ReadonlyRecord<string, A>,
  f: (k: string, a: A) => B
) => {
  const out: Record<string, B> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    out[key] = f(key, fa[key])
  }
  return out
}
