import { flow, pipe, tuple } from "../Function"
import * as P from "../Prelude"

export const StateInURI = "StateIn"
export type StateInURI = typeof StateInURI
export const StateOutURI = "StateOut"
export type StateOutURI = typeof StateOutURI

declare module "@effect-ts/hkt" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [StateInURI]: StateIn<S, A>
    [StateOutURI]: StateOut<S, A>
  }
}

/**
 * Take over ownership of "S" making it invariant
 */
export type V<C> = P.CleanParam<C, "S"> & P.V<"S", "_">

export type StateT<F extends P.URIS> = P.PrependURI<
  StateInURI,
  P.AppendURI<F, StateOutURI>
>

export interface StateIn<S, A> {
  (s: S): A
}

export type StateOut<S, A> = readonly [A, S]

export function monad<F extends P.URIS, C>(M: P.Monad<F, C>): P.Monad<StateT<F>, V<C>>
export function monad<F>(M: P.Monad<P.UHKT<F>>): P.Monad<StateT<P.UHKT<F>>, V<P.Auto>> {
  return P.instance({
    any: <S = any>() => (s: S): P.HKT<F, readonly [any, S]> =>
      pipe(
        M.any(),
        M.map((m) => tuple(m, s))
      ),
    flatten: <A, S2>(
      ffa: (s: S2) => P.HKT<F, readonly [(s: S2) => P.HKT<F, readonly [A, S2]>, S2]>
    ): ((s: S2) => P.HKT<F, readonly [A, S2]>) =>
      flow(
        ffa,
        P.chainF(M)(([f, us]) => f(us))
      ),
    map: <A, B>(f: (a: A) => B) => <S>(
      fa: (s: S) => P.HKT<F, readonly [A, S]>
    ): ((s: S) => P.HKT<F, readonly [B, S]>) =>
      flow(
        fa,
        M.map(([a, s]) => tuple(f(a), s))
      )
  })
}
