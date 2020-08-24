import type { Erase } from "@effect-ts/system/Utils"

import { flow, pipe, tuple } from "../../Function"
import type { StateInURI, StateOutURI } from "../../Modules"
import type { Monad } from "../../Prelude"
import { chainF } from "../../Prelude/DSL"
import type { URIS, V } from "../../Prelude/HKT"
import * as HKT from "../../Prelude/HKT"

export type StateTVariance<C> = Erase<HKT.Strip<C, "S">, HKT.Auto> & V<"S", "_">

export type StateT<F extends URIS> = HKT.PrependURI<
  StateInURI,
  HKT.AppendURI<StateOutURI, F>
>

export function monad<F extends URIS, C>(
  M: Monad<F, C>
): Monad<HKT.PrependURI<StateInURI, HKT.AppendURI<StateOutURI, F>>, StateTVariance<C>>
export function monad(M: Monad<[HKT.UF_]>): Monad<StateT<[HKT.UF_]>> {
  return HKT.instance({
    any: <S = any>() => (s: S): HKT.F_<readonly [any, S]> =>
      pipe(
        M.any(),
        M.map((m) => tuple(m, s))
      ),
    flatten: <A, S2>(
      ffa: (s: S2) => HKT.F_<readonly [(s: S2) => HKT.F_<readonly [A, S2]>, S2]>
    ): ((s: S2) => HKT.F_<readonly [A, S2]>) =>
      flow(
        ffa,
        chainF(M)(([f, us]) => f(us))
      ),
    map: <A, B>(f: (a: A) => B) => <N extends string, K, SI, SO, X, I, S, R, E>(
      fa: (s: S) => HKT.F_<readonly [A, S]>
    ): ((s: S) => HKT.F_<readonly [B, S]>) =>
      flow(
        fa,
        M.map(([a, s]) => tuple(f(a), s))
      )
  })
}
