import type { Erase } from "@effect-ts/system/Utils"

import * as StateT from "../"
import type { StateInURI, StateOutURI } from "../../../Modules"
import type { Monad } from "../../../Prelude"
import * as HKT from "../../../Prelude/HKT"

export type V<C, S> = HKT.Unfix<Erase<HKT.Strip<C, "S">, HKT.Auto>, "S"> &
  HKT.Fix<"S", S>

export type PState = "S"

export interface PSIn<S> extends HKT.URI<StateInURI, HKT.Fix<"S", S>> {}

export interface PSOut<S> extends HKT.URI<StateOutURI, HKT.Fix<"S", S>> {}

export type ParametricStateT<F extends HKT.URIS, S> = HKT.PrependURI<
  PSIn<S>,
  HKT.AppendURI<PSOut<S>, F>
>

export function monad<S>() {
  return <F extends HKT.URIS, C>(M: Monad<F, C>) => getMonad_<F, C, S>(M)
}

function getMonad_<F extends HKT.URIS, C, S>(
  M: Monad<F, C>
): Monad<ParametricStateT<F, S>, V<C, S>>
function getMonad_<S>(
  M: Monad<[HKT.UF_]>
): Monad<ParametricStateT<[HKT.UF_], S>, V<HKT.Auto, S>> {
  return HKT.instance(StateT.monad(M))
}
