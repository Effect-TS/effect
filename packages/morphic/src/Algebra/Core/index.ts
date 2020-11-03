import type { InterpreterURIS, Kind } from "../../HKT"

export type OfType<F extends InterpreterURIS, L, A, RC> = Kind<F, RC, L, A>

type Function1 = (a: any) => any

export type CacheType = <F extends Function1>(f: F) => F

export function cacheUnaryFunction<F extends Function1>(f: F) {
  type K = F extends (a: infer K) => any ? K : any
  type V = F extends (a: any) => infer V ? V : any
  const mapping = new Map<K, V>()
  const fres = (key: K): V => {
    const res = mapping.get(key)
    if (res !== undefined) {
      return res
    } else {
      const v = f(key)
      mapping.set(key, v)
      return v
    }
  }
  return fres as F
}

export type Compact<A> = {
  [K in keyof A]: A[K]
}
