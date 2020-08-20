import { Applicative } from "../Combined"
import { Auto, Base, G_, IndexFor, Kind, OrFix, UG_, URIS } from "../HKT"

import { Option } from "@effect-ts/system/Option"

export interface WitherWithIndex<F extends URIS, C = Auto> {
  <G extends URIS, GC = Auto>(F: Applicative<G, GC>): <
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
      k: IndexFor<F, OrFix<"N", C, FN>, OrFix<"K", C, FK>>,
      a: A
    ) => Kind<
      G,
      OrFix<"N", GC, GN>,
      OrFix<"K", GC, GK>,
      GSIO,
      GSIO,
      OrFix<"X", GC, GX>,
      OrFix<"I", GC, GI>,
      OrFix<"S", GC, GS>,
      OrFix<"R", GC, GR>,
      OrFix<"E", GC, GE>,
      Option<B>
    >
  ) => <FSI, FSO, FX, FI, FS, FR, FE>(
    ta: Kind<
      F,
      OrFix<"N", C, FN>,
      OrFix<"K", C, FK>,
      FSI,
      FSO,
      OrFix<"X", C, FX>,
      OrFix<"I", C, FI>,
      OrFix<"S", C, FS>,
      OrFix<"R", C, FR>,
      OrFix<"E", C, FE>,
      A
    >
  ) => Kind<
    G,
    OrFix<"N", GC, GN>,
    OrFix<"K", GC, GK>,
    GSIO,
    GSIO,
    OrFix<"X", GC, GX>,
    OrFix<"I", GC, GI>,
    OrFix<"S", GC, GS>,
    OrFix<"R", GC, GR>,
    OrFix<"E", GC, GE>,
    Kind<
      F,
      OrFix<"N", C, FN>,
      OrFix<"K", C, FK>,
      FSI,
      FSO,
      OrFix<"X", C, FX>,
      OrFix<"I", C, FI>,
      OrFix<"S", C, FS>,
      OrFix<"R", C, FR>,
      OrFix<"E", C, FE>,
      B
    >
  >
}

export interface WitherableWithIndex<F extends URIS, C = Auto> extends Base<F, C> {
  readonly compactWithIndexF: WitherWithIndex<F, C>
}

export function implementCompactWithIndexF<F extends URIS, C = Auto>(): (
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
    G: Applicative<UG_>
  ) => (
    f: (k: IndexFor<F, OrFix<"N", C, FN>, OrFix<"K", C, FK>>, a: A) => G_<Option<B>>
  ) => (
    ta: Kind<
      F,
      OrFix<"N", C, FN>,
      OrFix<"K", C, FK>,
      FSI,
      FSO,
      OrFix<"X", C, FX>,
      OrFix<"I", C, FI>,
      OrFix<"S", C, FS>,
      OrFix<"R", C, FR>,
      OrFix<"E", C, FE>,
      A
    >
  ) => G_<
    Kind<
      F,
      OrFix<"N", C, FN>,
      OrFix<"K", C, FK>,
      FSI,
      FSO,
      OrFix<"X", C, FX>,
      OrFix<"I", C, FI>,
      OrFix<"S", C, FS>,
      OrFix<"R", C, FR>,
      OrFix<"E", C, FE>,
      B
    >
  >
) => WitherWithIndex<F, C>
export function implementCompactWithIndexF() {
  return (i: any) => i()
}
