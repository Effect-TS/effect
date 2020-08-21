import type { Option } from "@effect-ts/system/Option"

import type { Applicative } from "../Combined"
import type * as HKT from "../HKT"

export interface WitherWithIndex<F extends HKT.URIS, C = HKT.Auto> {
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
    B,
    FN extends string,
    FK
  >(
    f: (
      k: HKT.IndexFor<F, HKT.OrFix<"N", C, FN>, HKT.OrFix<"K", C, FK>>,
      a: A
    ) => HKT.KindFix<G, GC, GN, GK, GSIO, GSIO, GX, GI, GS, GR, GE, Option<B>>
  ) => <FSI, FSO, FX, FI, FS, FR, FE>(
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

export interface WitherableWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly compactWithIndexF: WitherWithIndex<F, C>
}

export function implementCompactWithIndexF<F extends HKT.URIS, C = HKT.Auto>(): (
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
    f: (
      k: HKT.IndexFor<F, HKT.OrFix<"N", C, FN>, HKT.OrFix<"K", C, FK>>,
      a: A
    ) => HKT.G_<Option<B>>
  ) => (
    ta: HKT.KindFix<F, C, FN, FK, FSI, FSO, FX, FI, FS, FR, FE, A>
  ) => HKT.G_<HKT.Kind<F, C, FN, FK, FSI, FSO, FX, FI, FS, FR, FE, B>>
) => WitherWithIndex<F, C>
export function implementCompactWithIndexF() {
  return (i: any) => i()
}
