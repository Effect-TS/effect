import { Applicative } from "../Combined"
import {
  Auto,
  Base,
  G_,
  Kind,
  OrE,
  OrI,
  OrK,
  OrN,
  OrR,
  OrS,
  OrX,
  UG_,
  URIS
} from "../HKT"

import { Option } from "@effect-ts/system/Option"

export interface Wither<F extends URIS, C = Auto> {
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
    B
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
      Option<B>
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
    >
  >
}

export interface Witherable<F extends URIS, C = Auto> extends Base<F, C> {
  readonly compactF: Wither<F, C>
}

export function implementCompactF<F extends URIS, C = Auto>(): (
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
    f: (a: A) => G_<Option<B>>
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
    >
  >
) => Wither<F, C>
export function implementCompactF() {
  return (i: any) => i()
}
