import { Applicative } from "../Combined"
import {
  URIS,
  Auto,
  Kind,
  OrN,
  OrK,
  OrX,
  OrI,
  OrS,
  OrR,
  OrE,
  Base,
  UG_,
  G_
} from "../HKT"

import { Either } from "@effect-ts/system/Either"
import { Separated } from "@effect-ts/system/Utils"

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
      OrN<GC, GN>,
      OrK<GC, GK>,
      GSIO,
      GSIO,
      OrX<GC, GX>,
      OrI<GC, GI>,
      OrS<GC, GS>,
      OrR<GC, GR>,
      OrE<GC, GE>,
      Either<B, B2>
    >
  ) => <FN extends string, FK, FSI, FSO, FX, FI, FS, FR, FE>(
    ta: Kind<
      F,
      OrN<C, FN>,
      OrK<C, FK>,
      FSI,
      FSO,
      OrX<C, FX>,
      OrI<C, FI>,
      OrS<C, FS>,
      OrR<C, FR>,
      OrE<C, FE>,
      A
    >
  ) => Kind<
    G,
    OrN<GC, GN>,
    OrK<GC, GK>,
    GSIO,
    GSIO,
    OrX<GC, GX>,
    OrI<GC, GI>,
    OrS<GC, GS>,
    OrR<GC, GR>,
    OrE<GC, GE>,
    Separated<
      Kind<
        F,
        OrN<C, FN>,
        OrK<C, FK>,
        FSI,
        FSO,
        OrX<C, FX>,
        OrI<C, FI>,
        OrS<C, FS>,
        OrR<C, FR>,
        OrE<C, FE>,
        B
      >,
      Kind<
        F,
        OrN<C, FN>,
        OrK<C, FK>,
        FSI,
        FSO,
        OrX<C, FX>,
        OrI<C, FI>,
        OrS<C, FS>,
        OrR<C, FR>,
        OrE<C, FE>,
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
      OrN<C, FN>,
      OrK<C, FK>,
      FSI,
      FSO,
      OrX<C, FX>,
      OrI<C, FI>,
      OrS<C, FS>,
      OrR<C, FR>,
      OrE<C, FE>,
      A
    >
  ) => G_<
    Separated<
      Kind<
        F,
        OrN<C, FN>,
        OrK<C, FK>,
        FSI,
        FSO,
        OrX<C, FX>,
        OrI<C, FI>,
        OrS<C, FS>,
        OrR<C, FR>,
        OrE<C, FE>,
        B
      >,
      Kind<
        F,
        OrN<C, FN>,
        OrK<C, FK>,
        FSI,
        FSO,
        OrX<C, FX>,
        OrI<C, FI>,
        OrS<C, FS>,
        OrR<C, FR>,
        OrE<C, FE>,
        B2
      >
    >
  >
) => Wilt<F, C>
export function implementSeparateF() {
  return (i: any) => i()
}
