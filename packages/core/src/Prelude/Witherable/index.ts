import type { Option } from "@effect-ts/system/Option"

import type { Applicative } from "../Combined"
import type * as HKT from "../HKT"

export interface Wither<F extends HKT.URIS, C = HKT.Auto> {
  <G extends HKT.URIS, GC = HKT.Auto>(F: Applicative<G, GC>): <
    GN extends string,
    GK,
    GSIO,
    GX,
    GI,
    GS,
    GR,
    GE,
    A,
    B
  >(
    f: (a: A) => HKT.KindFix<G, GC, GN, GK, GSIO, GSIO, GX, GI, GS, GR, GE, Option<B>>
  ) => <FN extends string, FK, FSI, FSO, FX, FI, FS, FR, FE>(
    ta: HKT.KindFix<F, C, FN, FK, FSI, FSO, FX, FI, FS, FR, FE, A>
  ) => HKT.KindFix<
    G,
    GC,
    GN,
    GK,
    GSIO,
    GSIO,
    GX,
    GI,
    GS,
    GR,
    GE,
    HKT.KindFix<F, C, FN, FK, FSI, FSO, FX, FI, FS, FR, FE, B>
  >
}

export interface Witherable<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly compactF: Wither<F, C>
}

export function implementCompactF<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <FN extends string, FK, FSI, FSO, FX, FI, FS, FR, FE, A, B>(_: {
    A: A
    B: B
    FN: FN
    FK: FK
    FSI: FSI
    FSO: FSO
    FX: FX
    FI: FI
    FS: FS
    FR: FR
    FE: FE
  }) => (
    G: Applicative<[HKT.UG_]>
  ) => (
    f: (a: A) => HKT.G_<Option<B>>
  ) => (
    ta: HKT.KindFix<F, C, FN, FK, FSI, FSO, FX, FI, FS, FR, FE, A>
  ) => HKT.G_<HKT.KindFix<F, C, FN, FK, FSI, FSO, FX, FI, FS, FR, FE, B>>
) => Wither<F, C>
export function implementCompactF() {
  return (i: any) => i()
}
