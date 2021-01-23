import type { Either } from "@effect-ts/system/Either"
import type { Separated } from "@effect-ts/system/Utils"

import type { Applicative } from "../Applicative"
import type * as HKT from "../HKT"

export interface Wilt<F extends HKT.URIS, C = HKT.Auto> {
  <G extends HKT.URIS, GC = HKT.Auto>(F: Applicative<G, GC>): <
    GN extends string,
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
    f: (a: A) => HKT.Kind<G, GC, GN, GK, GQ, GW, GX, GI, GS, GR, GE, Either<B, B2>>
  ) => <FN extends string, FK, FQ, FW, FX, FI, FS, FR, FE>(
    ta: HKT.Kind<F, C, FN, FK, FQ, FW, FX, FI, FS, FR, FE, A>
  ) => HKT.Kind<
    G,
    GC,
    GN,
    GK,
    GQ,
    GW,
    GX,
    GI,
    GS,
    GR,
    GE,
    Separated<
      HKT.Kind<F, C, FN, FK, FQ, FW, FX, FI, FS, FR, FE, B>,
      HKT.Kind<F, C, FN, FK, FQ, FW, FX, FI, FS, FR, FE, B2>
    >
  >
}

export interface Wiltable<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly separateF: Wilt<F, C>
}

export function implementSeparateF<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <FN extends string, FK, FQ, FW, FX, FI, FS, FR, FE, A, B, B2, G>(_: {
    A: A
    B: B
    G: G
    FN: FN
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
    ta: HKT.Kind<F, C, FN, FK, FQ, FW, FX, FI, FS, FR, FE, A>
  ) => HKT.HKT<
    G,
    Separated<
      HKT.Kind<F, C, FN, FK, FQ, FW, FX, FI, FS, FR, FE, B>,
      HKT.Kind<F, C, FN, FK, FQ, FW, FX, FI, FS, FR, FE, B2>
    >
  >
) => Wilt<F, C>
export function implementSeparateF() {
  return (i: any) => i()
}
