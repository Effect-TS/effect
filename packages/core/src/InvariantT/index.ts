import * as P from "../Prelude"

export function monad<P extends P.Param>(
  _: P
): <F extends P.URIS, C>(
  M: P.Monad<F, C>
) => P.Monad<F, P.CleanParam<C, P> & P.V<P, "_">>
export function monad<P extends P.Param>(_: P) {
  return <F, C>(
    M: P.Monad<P.UHKT<F>, C>
  ): P.Monad<P.UHKT<F>, P.CleanParam<C, P> & P.V<P, "_">> => P.instance(M)
}

export function applicative<P extends P.Param>(
  _: P
): <F extends P.URIS, C>(
  M: P.Applicative<F, C>
) => P.Applicative<F, P.CleanParam<C, P> & P.V<P, "_">>
export function applicative<P extends P.Param>(_: P) {
  return <F, C>(
    M: P.Applicative<P.UHKT<F>, C>
  ): P.Applicative<P.UHKT<F>, P.CleanParam<C, P> & P.V<P, "_">> => P.instance(M)
}
