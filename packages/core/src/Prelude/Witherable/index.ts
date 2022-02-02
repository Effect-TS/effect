// ets_tracing: off

import type { Option } from "@effect-ts/system/Option"

import type { Applicative } from "../Applicative/index.js"
import type * as HKT from "../HKT/index.js"

export interface Wither<F extends HKT.URIS, C = HKT.Auto> {
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
    B
  >(
    f: (a: A) => HKT.Kind<G, GC, GK, GQ, GW, GX, GI, GS, GR, GE, Option<B>>
  ) => <FK, FSI, FSO, FX, FI, FS, FR, FE>(
    ta: HKT.Kind<F, C, FK, FSI, FSO, FX, FI, FS, FR, FE, A>
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
    HKT.Kind<F, C, FK, FSI, FSO, FX, FI, FS, FR, FE, B>
  >
}

export interface Witherable<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly _Witherable: "Witherable"
  readonly compactF: Wither<F, C>
}

export function implementCompactF<F extends HKT.URIS, C = HKT.Auto>(): (
  i: <FK, FQ, FW, FX, FI, FS, FR, FE, A, B, G>(_: {
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
    f: (a: A) => HKT.HKT<G, Option<B>>
  ) => (
    ta: HKT.Kind<F, C, FK, FQ, FW, FX, FI, FS, FR, FE, A>
  ) => HKT.HKT<G, HKT.Kind<F, C, FK, FQ, FW, FX, FI, FS, FR, FE, B>>
) => Wither<F, C>
export function implementCompactF() {
  return (i: any) => i()
}
