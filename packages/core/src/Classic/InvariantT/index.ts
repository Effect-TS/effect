import * as P from "../../Prelude"
import type * as HKT from "../../Prelude/HKT"

export function monad<P extends HKT.Param>(_: P) {
  return <F extends HKT.URIS, C>(
    M: P.Monad<F, C>
  ): P.Monad<F, HKT.CleanParam<C, P> & P.V<P, "_">> => P.instance(M as any)
}

export function applicative<P extends HKT.Param>(_: P) {
  return <F extends HKT.URIS, C>(
    M: P.Applicative<F, C>
  ): P.Applicative<F, HKT.CleanParam<C, P> & P.V<P, "_">> => P.instance(M as any)
}
