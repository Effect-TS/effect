import type { StateIn, StateOut } from ".."
import { flow, pipe, tuple } from "../../../Function"
import type { StateInURI, StateOutURI } from "../../../Modules"
import type { Monad } from "../../../Prelude"
import { chainF } from "../../../Prelude/DSL"
import type { URI, URIS } from "../../../Prelude/HKT"
import * as HKT from "../../../Prelude/HKT"

export type PState = "S"

export interface PSIn<S> extends URI<StateInURI, HKT.Fix<"S", S>> {}

export interface PSOut<S> extends URI<StateOutURI, HKT.Fix<"S", S>> {}

export type ParametricStateT<F extends URIS, S> = HKT.InvertedUnionURI<
  PSIn<S>,
  HKT.UnionURI<PSOut<S>, F>
>

export function monad<S>() {
  return <F extends URIS, C>(M: Monad<F, C>) => getMonad_<F, C, S>(M)
}

function getMonad_<F extends URIS, C, S>(
  M: Monad<F, C>
): Monad<ParametricStateT<F, S>, C>
function getMonad_<S>(M: Monad<[HKT.UF_]>): Monad<ParametricStateT<[HKT.UF_], S>> {
  return HKT.instance({
    any: (): StateIn<S, HKT.F_<StateOut<S, any>>> => (s) =>
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
