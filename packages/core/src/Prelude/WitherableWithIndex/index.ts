import type { Option } from "@effect-ts/system/Option"

import type { Applicative } from "../Applicative"
import type * as HKT from "../HKT"

export interface WitherWithIndex<F extends HKT.URIS, C = HKT.Auto> {
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
    FN extends string,
    FK
  >(
    f: (
      k: HKT.IndexFor<F, HKT.OrFix<"N", C, FN>, HKT.OrFix<"K", C, FK>>,
      a: A
    ) => HKT.Kind<G, GC, GN, GK, GQ, GW, GX, GI, GS, GR, GE, Option<B>>
  ) => <FQ, FW, FX, FI, FS, FR, FE>(
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
    HKT.Kind<F, C, FN, FK, FQ, FW, FX, FI, FS, FR, FE, B>
  >
}

export interface WitherableWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly compactWithIndexF: WitherWithIndex<F, C>
}

export function implementCompactWithIndexF<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <FN extends string, FK, FQ, FW, FX, FI, FS, FR, FE, A, B, G>(_: {
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
    f: (
      k: HKT.IndexFor<F, HKT.OrFix<"N", C, FN>, HKT.OrFix<"K", C, FK>>,
      a: A
    ) => HKT.HKT<G, Option<B>>
  ) => (
    ta: HKT.Kind<F, C, FN, FK, FQ, FW, FX, FI, FS, FR, FE, A>
  ) => HKT.HKT<G, HKT.Kind<F, C, FN, FK, FQ, FW, FX, FI, FS, FR, FE, B>>
) => WitherWithIndex<F, C>
export function implementCompactWithIndexF() {
  return (i: any) => i()
}
