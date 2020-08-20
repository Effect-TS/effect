import type { Either } from "@effect-ts/system/Either"
import type { Separated } from "@effect-ts/system/Utils"

import type { Applicative } from "../Combined"
import type { Auto, Base, G_, IndexFor, Kind, OrFix, UG_, URIS } from "../HKT"

export interface WiltWithIndex<F extends URIS, C = Auto> {
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
    B2,
    FN extends string,
    FK
  >(
    f: (
      k: IndexFor<F, OrFix<"N", C, FN>, OrFix<"K", C, FK>>,
      a: A
    ) => Kind<
      G,
      GC,
      OrFix<"N", GC, GN>,
      OrFix<"K", GC, GK>,
      GSIO,
      GSIO,
      OrFix<"X", GC, GX>,
      OrFix<"I", GC, GI>,
      OrFix<"S", GC, GS>,
      OrFix<"R", GC, GR>,
      OrFix<"E", GC, GE>,
      Either<B, B2>
    >
  ) => <FSI, FSO, FX, FI, FS, FR, FE>(
    ta: Kind<
      F,
      GC,
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
    GC,
    OrFix<"N", GC, GN>,
    OrFix<"K", GC, GK>,
    GSIO,
    GSIO,
    OrFix<"X", GC, GX>,
    OrFix<"I", GC, GI>,
    OrFix<"S", GC, GS>,
    OrFix<"R", GC, GR>,
    OrFix<"E", GC, GE>,
    Separated<
      Kind<
        F,
        C,
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
      >,
      Kind<
        F,
        C,
        OrFix<"N", C, FN>,
        OrFix<"K", C, FK>,
        FSI,
        FSO,
        OrFix<"X", C, FX>,
        OrFix<"I", C, FI>,
        OrFix<"S", C, FS>,
        OrFix<"R", C, FR>,
        OrFix<"E", C, FE>,
        B2
      >
    >
  >
}

export interface WiltableWithIndex<F extends URIS, C = Auto> extends Base<F, C> {
  readonly separateWithIndexF: WiltWithIndex<F, C>
}

export function implementSeparateWithIndexF<F extends URIS, C = Auto>(): (
  i: <FN extends string, FK, FSI, FSO, FX, FI, FS, FR, FE, A, B, B2>(_: {
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
    G: Applicative<[UG_]>
  ) => (
    f: (k: IndexFor<F, OrFix<"N", C, FN>, OrFix<"K", C, FK>>, a: A) => G_<Either<B, B2>>
  ) => (
    ta: Kind<
      F,
      C,
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
    Separated<
      Kind<
        F,
        C,
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
      >,
      Kind<
        F,
        C,
        OrFix<"N", C, FN>,
        OrFix<"K", C, FK>,
        FSI,
        FSO,
        OrFix<"X", C, FX>,
        OrFix<"I", C, FI>,
        OrFix<"S", C, FS>,
        OrFix<"R", C, FR>,
        OrFix<"E", C, FE>,
        B2
      >
    >
  >
) => WiltWithIndex<F, C>
export function implementSeparateWithIndexF() {
  return (i: any) => i()
}
