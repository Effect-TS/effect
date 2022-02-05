// ets_tracing: off

import type { Either } from "@effect-ts/system/Either"

import type * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type { Applicative } from "../Applicative/index.js"
import type * as HKT from "../HKT/index.js"

export interface WiltWithIndex<F extends HKT.URIS, C = HKT.Auto> {
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
    B2,
    FK
  >(
    f: (
      k: HKT.IndexFor<F, HKT.OrFix<"K", C, FK>>,
      a: A
    ) => HKT.Kind<G, GC, GK, GQ, GW, GX, GI, GS, GR, GE, Either<B, B2>>
  ) => <FSI, FSO, FX, FI, FS, FR, FE>(
    ta: HKT.Kind<F, GC, FK, FSI, FSO, FX, FI, FS, FR, FE, A>
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
        HKT.Kind<F, C, FK, FSI, FSO, FX, FI, FS, FR, FE, B>,
        HKT.Kind<F, C, FK, FSI, FSO, FX, FI, FS, FR, FE, B2>
      ]
    >
  >
}

export interface WiltableWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly _WiltableWithIndex: "WiltableWithIndex"
  readonly separateWithIndexF: WiltWithIndex<F, C>
}

export function implementSeparateWithIndexF<F extends HKT.URIS, C = HKT.Auto>(): (
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
    f: (k: HKT.IndexFor<F, HKT.OrFix<"K", C, FK>>, a: A) => HKT.HKT<G, Either<B, B2>>
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
) => WiltWithIndex<F, C>
export function implementSeparateWithIndexF() {
  return (i: any) => i()
}
