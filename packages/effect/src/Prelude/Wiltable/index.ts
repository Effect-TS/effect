import type { Either } from "@effect-ts/system/Either"
import type { Separated } from "@effect-ts/system/Utils"

import type { Applicative } from "../Combined"
import type { Auto, Base, G_, Kind, OrFix, UG_, URIS } from "../HKT"

export interface Wilt<F extends URIS, C = Auto> {
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
    B2
  >(
    f: (
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
      Either<B, B2>
    >
  ) => <FN extends string, FK, FSI, FSO, FX, FI, FS, FR, FE>(
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
    Separated<
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
      >,
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
        B2
      >
    >
  >
}

export interface Wiltable<F extends URIS, C = Auto> extends Base<F, C> {
  readonly separateF: Wilt<F, C>
}

export function implementSeparateF<F extends URIS, C = Auto>(): (
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
    G: Applicative<UG_>
  ) => (
    f: (a: A) => G_<Either<B, B2>>
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
    Separated<
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
      >,
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
        B2
      >
    >
  >
) => Wilt<F, C>
export function implementSeparateF() {
  return (i: any) => i()
}
