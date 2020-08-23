import type { Erase } from "@effect-ts/system/Utils"

import { flow, pipe, tuple } from "../../Function"
import type { StateInURI, StateOutURI } from "../../Modules"
import type { Monad } from "../../Prelude"
import { chainF } from "../../Prelude/DSL"
import type { URIS, V } from "../../Prelude/HKT"
import * as HKT from "../../Prelude/HKT"

export interface StateIn<S, A> {
  (s: S): A
}

export type StateOut<S, A> = readonly [A, S]

export type StateTVariance<C> = Erase<HKT.Strip<C, "S">, HKT.Auto> & V<"S", "_">

export type StateT<F extends URIS> = HKT.InvertedUnionURI<
  StateInURI,
  HKT.UnionURI<StateOutURI, F>
>

export function monad<F extends URIS, C>(
  M: Monad<F, C>
): Monad<
  HKT.InvertedUnionURI<StateInURI, HKT.UnionURI<StateOutURI, F>>,
  StateTVariance<C>
>
export function monad(M: Monad<[HKT.UF_]>): Monad<StateT<[HKT.UF_]>> {
  return HKT.instance({
    any: <S = any>(): StateIn<S, HKT.F_<StateOut<S, any>>> => (s) =>
      pipe(
        M.any(),
        M.map((m) => tuple(m, s))
      ),
    flatten: <A, S2>(
      ffa: StateIn<S2, HKT.F_<StateOut<S2, StateIn<S2, HKT.F_<StateOut<S2, A>>>>>>
    ): StateIn<S2, HKT.F_<StateOut<S2, A>>> =>
      flow(
        ffa,
        chainF(M)(([f, us]) => f(us))
      ),
    map: <A, B>(f: (a: A) => B) => <S>(
      fa: StateIn<S, HKT.F_<StateOut<S, A>>>
    ): StateIn<S, HKT.F_<StateOut<S, B>>> =>
      flow(
        fa,
        M.map(([a, s]) => tuple(f(a), s))
      )
  })
}
