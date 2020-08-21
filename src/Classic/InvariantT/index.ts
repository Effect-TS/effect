import type { Erase } from "@effect-ts/system/Utils"

import * as P from "../../Prelude"
import type { URIS } from "../../Prelude/HKT"
import type { Par } from "../../Prelude/HKT/variance"

type Strip<
  C,
  P extends Par,
  A extends "+" | "-" | "_",
  B extends "+" | "-" | "_"
> = Erase<Erase<C, P.V<P, A>>, P.V<P, B>>

export function monad<P extends Par>(_: P) {
  return <F extends URIS, C>(
    M: P.Monad<F, C>
  ): P.Monad<F, Strip<C, P, "+", "-"> & P.V<P, "_">> => P.instance(M)
}

export function applicative<P extends Par>(_: P) {
  return <F extends URIS, C>(
    M: P.Applicative<F, C>
  ): P.Applicative<F, Strip<C, P, "+", "-"> & P.V<P, "_">> => P.instance(M)
}
