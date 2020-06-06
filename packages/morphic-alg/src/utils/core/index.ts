import { AnyEnv } from "../../config"
import type {
  URIS,
  URIS2,
  Kind,
  Kind2,
  Algebra as AlgAlgebra,
  Algebra1 as AlgAlgebra1,
  Algebra2 as AlgAlgebra2,
  AlgebraURIS
} from "../hkt"

export type OfType<F extends URIS, A, RC> = Kind<F, RC, A>

export type OfType2<F extends URIS2, L, A, RC> = Kind2<F, RC, L, A>

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

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never

export type Compact<A> = {
  [K in keyof A]: A[K]
}

export type GetAlgebra<A extends AlgebraURIS> = A

export type Algebra<AllAlgebra extends AlgebraURIS, Interp, Env> = UnionToIntersection<
  AlgAlgebra<Interp, Env>[AllAlgebra]
>

export type Algebra1<
  AllAlgebra extends AlgebraURIS,
  Interp extends URIS,
  Env extends AnyEnv
> = UnionToIntersection<AlgAlgebra1<Interp, Env>[AllAlgebra]>

export type Algebra2<
  AllAlgebra extends AlgebraURIS,
  Interp extends URIS2,
  Env extends AnyEnv
> = UnionToIntersection<AlgAlgebra2<Interp, Env>[AllAlgebra]>
