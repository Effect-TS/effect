import * as StateT from "../"
import type { StateInURI, StateOutURI } from "../../../Modules"
import type { Monad } from "../../../Prelude"
import type { URI, URIS } from "../../../Prelude/HKT"
import * as HKT from "../../../Prelude/HKT"

export type PState = "S"

export interface PSIn<S> extends URI<StateInURI, HKT.Fix<"S", S>> {}

export interface PSOut<S> extends URI<StateOutURI, HKT.Fix<"S", S>> {}

export type ParametricStateT<F extends URIS, S> = HKT.PrependURI<
  PSIn<S>,
  HKT.AppendURI<PSOut<S>, F>
>

export function monad<S>() {
  return <F extends URIS, C>(M: Monad<F, C>) => getMonad_<F, C, S>(M)
}

function getMonad_<F extends URIS, C, S>(
  M: Monad<F, C>
): Monad<ParametricStateT<F, S>, C>
function getMonad_<S>(M: Monad<[HKT.UF_]>): Monad<ParametricStateT<[HKT.UF_], S>> {
  return HKT.instance(StateT.monad(M))
}
