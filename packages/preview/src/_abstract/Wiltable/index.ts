import { Either } from "../../Either"
import { Separated } from "../../_system/Utils"
import { ApplicativeF, ApplicativeK } from "../Applicative"
import { HasURI, HKTFix, KindFix, URIS } from "../HKT"

export interface WiltF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any> {
  <G, GFix0 = any, GFix1 = any, GFix2 = any, GFix3 = any>(
    F: ApplicativeF<G, GFix0, GFix1, GFix2, GFix3>
  ): <GK, GNK extends string, GSIO, GX, GIn, GSt, GEnv, GErr, A, B, C>(
    f: (
      a: A
    ) => HKTFix<
      G,
      GFix0,
      GFix1,
      GFix2,
      GFix3,
      GK,
      GNK,
      GSIO,
      GSIO,
      GX,
      GIn,
      GSt,
      GEnv,
      GErr,
      Either<B, C>
    >
  ) => <FK, FNK extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
    ta: HKTFix<
      F,
      Fix0,
      Fix1,
      Fix2,
      Fix3,
      FK,
      FNK,
      FSI,
      FSO,
      FX,
      FIn,
      FSt,
      FEnv,
      FErr,
      A
    >
  ) => HKTFix<
    G,
    GFix0,
    GFix1,
    GFix2,
    GFix3,
    GK,
    GNK,
    GSIO,
    GSIO,
    GX,
    GIn,
    GSt,
    GEnv,
    GErr,
    Separated<
      HKTFix<F, Fix0, Fix1, Fix2, Fix3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>,
      HKTFix<F, Fix0, Fix1, Fix2, Fix3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, C>
    >
  >

  <G extends URIS, GFix0 = any, GFix1 = any, GFix2 = any, GFix3 = any>(
    F: ApplicativeK<G, GFix0, GFix1, GFix2, GFix3>
  ): <GK, GNK extends string, GSIO, GX, GIn, GSt, GEnv, GErr, A, B, C>(
    f: (
      a: A
    ) => KindFix<
      G,
      GFix0,
      GFix1,
      GFix2,
      GFix3,
      GK,
      GNK,
      GSIO,
      GSIO,
      GX,
      GIn,
      GSt,
      GEnv,
      GErr,
      Either<B, C>
    >
  ) => <FK, FNK extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
    ta: HKTFix<
      F,
      Fix0,
      Fix1,
      Fix2,
      Fix3,
      FK,
      FNK,
      FSI,
      FSO,
      FX,
      FIn,
      FSt,
      FEnv,
      FErr,
      A
    >
  ) => KindFix<
    G,
    GFix0,
    GFix1,
    GFix2,
    GFix3,
    GK,
    GNK,
    GSIO,
    GSIO,
    GX,
    GIn,
    GSt,
    GEnv,
    GErr,
    Separated<
      HKTFix<F, Fix0, Fix1, Fix2, Fix3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>,
      HKTFix<F, Fix0, Fix1, Fix2, Fix3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, C>
    >
  >
}

export interface WiltableF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>
  extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly separateF: WiltF<F, Fix0, Fix1, Fix2, Fix3>
}

export interface WiltK<F extends URIS, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any> {
  <G, GFix0 = any, GFix1 = any, GFix2 = any, GFix3 = any>(
    F: ApplicativeF<G, GFix0, GFix1, GFix2, GFix3>
  ): <GK, GNK extends string, GSIO, GX, GIn, GSt, GEnv, GErr, A, B, C>(
    f: (
      a: A
    ) => HKTFix<
      G,
      GFix0,
      GFix1,
      GFix2,
      GFix3,
      GK,
      GNK,
      GSIO,
      GSIO,
      GX,
      GIn,
      GSt,
      GEnv,
      GErr,
      Either<B, C>
    >
  ) => <FK, FNK extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
    ta: KindFix<
      F,
      Fix0,
      Fix1,
      Fix2,
      Fix3,
      FK,
      FNK,
      FSI,
      FSO,
      FX,
      FIn,
      FSt,
      FEnv,
      FErr,
      A
    >
  ) => HKTFix<
    G,
    GFix0,
    GFix1,
    GFix2,
    GFix3,
    GK,
    GNK,
    GSIO,
    GSIO,
    GX,
    GIn,
    GSt,
    GEnv,
    GErr,
    Separated<
      KindFix<
        F,
        Fix0,
        Fix1,
        Fix2,
        Fix3,
        FK,
        FNK,
        FSI,
        FSO,
        FX,
        FIn,
        FSt,
        FEnv,
        FErr,
        B
      >,
      KindFix<F, Fix0, Fix1, Fix2, Fix3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, C>
    >
  >

  <G extends URIS, GFix0 = any, GFix1 = any, GFix2 = any, GFix3 = any>(
    F: ApplicativeK<G, GFix0, GFix1, GFix2, GFix3>
  ): <GK, GNK extends string, GSIO, GX, GIn, GSt, GEnv, GErr, A, B, C>(
    f: (
      a: A
    ) => KindFix<
      G,
      GFix0,
      GFix1,
      GFix2,
      GFix3,
      GK,
      GNK,
      GSIO,
      GSIO,
      GX,
      GIn,
      GSt,
      GEnv,
      GErr,
      Either<B, C>
    >
  ) => <FK, FNK extends string, FSI, FSO, FX, FIn, FSt, FEnv, FErr>(
    ta: KindFix<
      F,
      Fix0,
      Fix1,
      Fix2,
      Fix3,
      FK,
      FNK,
      FSI,
      FSO,
      FX,
      FIn,
      FSt,
      FEnv,
      FErr,
      A
    >
  ) => KindFix<
    G,
    GFix0,
    GFix1,
    GFix2,
    GFix3,
    GK,
    GNK,
    GSIO,
    GSIO,
    GX,
    GIn,
    GSt,
    GEnv,
    GErr,
    Separated<
      KindFix<
        F,
        Fix0,
        Fix1,
        Fix2,
        Fix3,
        FK,
        FNK,
        FSI,
        FSO,
        FX,
        FIn,
        FSt,
        FEnv,
        FErr,
        B
      >,
      KindFix<F, Fix0, Fix1, Fix2, Fix3, FK, FNK, FSI, FSO, FX, FIn, FSt, FEnv, FErr, C>
    >
  >
}

export interface WiltableK<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly separateF: WiltK<F, Fix0, Fix1, Fix2, Fix3>
}

export function makeWiltable<
  URI extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  _: URI
): (
  _: Omit<
    WiltableK<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => WiltableK<URI, Fix0, Fix1, Fix2, Fix3>
export function makeWiltable<URI, Fix0, Fix1, Fix2, Fix3>(
  URI: URI
): (
  _: Omit<
    WiltableF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => WiltableF<URI, Fix0, Fix1, Fix2, Fix3>
export function makeWiltable<URI, Fix0, Fix1, Fix2, Fix3>(
  URI: URI
): (
  _: Omit<
    WiltableF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => WiltableF<URI, Fix0, Fix1, Fix2, Fix3> {
  return (_) => ({
    URI,
    Fix0: undefined as any,
    Fix1: undefined as any,
    Fix2: undefined as any,
    Fix3: undefined as any,
    ..._
  })
}

export function implementSeparateF<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(F: F) {
  return (
    i: <
      GK,
      GNK extends string,
      GSIO,
      GX,
      GIn,
      GSt,
      GEnv,
      GErr,
      A,
      B,
      C,
      FK,
      FNK extends string,
      FSI,
      FSO,
      FX,
      FIn,
      FSt,
      FEnv,
      FErr,
      G,
      GFix0 = any,
      GFix1 = any,
      GFix2 = any,
      GFix3 = any
    >(_: {
      G: G
      GK: GK
      GNK: GNK
      GSIO: GSIO
      GX: GX
      GIn: GIn
      GSt: GSt
      GEnv: GEnv
      GErr: GErr
      A: A
      B: B
      C: C
      FK: FK
      FNK: FNK
      FSI: FSI
      FSO: FSO
      FX: FX
      FIn: FIn
      FSt: FSt
      FEnv: FEnv
      FErr: FErr
    }) => (
      G: ApplicativeF<G, GFix0, GFix1, GFix2, GFix3>
    ) => (
      f: (
        a: A
      ) => HKTFix<
        G,
        GFix0,
        GFix1,
        GFix2,
        GFix3,
        GK,
        GNK,
        GSIO,
        GSIO,
        GX,
        GIn,
        GSt,
        GEnv,
        GErr,
        Either<B, C>
      >
    ) => (
      ta: KindFix<
        F,
        Fix0,
        Fix1,
        Fix2,
        Fix3,
        FK,
        FNK,
        FSI,
        FSO,
        FX,
        FIn,
        FSt,
        FEnv,
        FErr,
        A
      >
    ) => HKTFix<
      G,
      GFix0,
      GFix1,
      GFix2,
      GFix3,
      GK,
      GNK,
      GSIO,
      GSIO,
      GX,
      GIn,
      GSt,
      GEnv,
      GErr,
      Separated<
        KindFix<
          F,
          Fix0,
          Fix1,
          Fix2,
          Fix3,
          FK,
          FNK,
          FSI,
          FSO,
          FX,
          FIn,
          FSt,
          FEnv,
          FErr,
          B
        >,
        KindFix<
          F,
          Fix0,
          Fix1,
          Fix2,
          Fix3,
          FK,
          FNK,
          FSI,
          FSO,
          FX,
          FIn,
          FSt,
          FEnv,
          FErr,
          C
        >
      >
    >
  ): WiltK<F, Fix0, Fix1, Fix2, Fix3> =>
    i({
      A: undefined as any,
      B: undefined as any,
      C: undefined as any,
      FEnv: undefined as any,
      FErr: undefined as any,
      FIn: undefined as any,
      FK: undefined as any,
      FNK: undefined as any,
      FSI: undefined as any,
      FSO: undefined as any,
      FSt: undefined as any,
      FX: undefined as any,
      G: undefined as any,
      GEnv: undefined as any,
      GErr: undefined as any,
      GIn: undefined as any,
      GK: undefined as any,
      GNK: undefined as any,
      GSIO: undefined as any,
      GSt: undefined as any,
      GX: undefined as any
    }) as any
}
