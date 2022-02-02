// ets_tracing: off

import type { Either } from "@effect-ts/system/Either"

import type * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type { Applicative } from "../Applicative/index.js"
import type * as HKT from "../HKT/index.js"

export interface Wilt<F extends HKT.URIS, C = HKT.Auto> {
  <G extends HKT.URIS, GC = HKT.Auto>(F: Applicative<G, GC>): <
    GK,
    GQ,
    GW,
    GX,
    GI,
    GS,
    GR,
    GE,
    A,
    B,
    B2
  >(
    f: (a: A) => HKT.Kind<G, GC, GK, GQ, GW, GX, GI, GS, GR, GE, Either<B, B2>>
  ) => <FK, FQ, FW, FX, FI, FS, FR, FE>(
    ta: HKT.Kind<F, C, FK, FQ, FW, FX, FI, FS, FR, FE, A>
  ) => HKT.Kind<
    G,
    GC,
    GK,
    GQ,
    GW,
    GX,
    GI,
    GS,
    GR,
    GE,
    Tp.Tuple<
      [
        HKT.Kind<F, C, FK, FQ, FW, FX, FI, FS, FR, FE, B>,
        HKT.Kind<F, C, FK, FQ, FW, FX, FI, FS, FR, FE, B2>
      ]
    >
  >
}

export interface Wiltable<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly _Wiltable: "Wiltable"
  readonly separateF: Wilt<F, C>
}

export function implementSeparateF<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <FK, FQ, FW, FX, FI, FS, FR, FE, A, B, B2, G>(_: {
    A: A
    B: B
    G: G
    FK: FK
    FQ: FQ
    FW: FW
    FX: FX
    FI: FI
    FS: FS
    FR: FR
    FE: FE
  }) => (
    G: Applicative<HKT.UHKT<G>>
  ) => (
    f: (a: A) => HKT.HKT<G, Either<B, B2>>
  ) => (
    ta: HKT.Kind<F, C, FK, FQ, FW, FX, FI, FS, FR, FE, A>
  ) => HKT.HKT<
    G,
    Tp.Tuple<
      [
        HKT.Kind<F, C, FK, FQ, FW, FX, FI, FS, FR, FE, B>,
        HKT.Kind<F, C, FK, FQ, FW, FX, FI, FS, FR, FE, B2>
      ]
    >
  >
) => Wilt<F, C>
export function implementSeparateF() {
  return (i: any) => i()
}
