import { CovariantF, CovariantK, CovariantKE } from "../Covariant"
import { HKTTL, KindTL, URIS } from "../HKT"
import { IdentityBothF, IdentityBothK, IdentityBothKE } from "../IdentityBoth"

export interface ForeachF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any> {
  <G, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothF<G, GTL0, GTL1, GTL2, GTL3> & CovariantF<G, GTL0, GTL1, GTL2, GTL3>
  ): <GSIO, GK, GKN extends string, GX, GI, GS, GR, GE, A, B>(
    f: (
      a: A
    ) => HKTTL<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, GX, GI, GS, GR, GE, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FI, FS, FEnv, FE>(
    fa: HKTTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, FE, A>
  ) => HKTTL<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN,
    GSIO,
    GSIO,
    GX,
    GI,
    GS,
    GR,
    GE,
    HKTTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, FE, B>
  >
  <G extends URIS, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothK<G, GTL0, GTL1, GTL2, GTL3> & CovariantK<G, GTL0, GTL1, GTL2, GTL3>
  ): <GSIO, GK, GKN extends string, GX, GI, GS, GEnv, GE, A, B>(
    f: (
      a: A
    ) => KindTL<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, GX, GI, GS, GEnv, GE, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FI, FS, FEnv, FE>(
    fa: HKTTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, FE, A>
  ) => KindTL<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN,
    GSIO,
    GSIO,
    GX,
    GI,
    GS,
    GEnv,
    GE,
    HKTTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, FE, B>
  >
  <G extends URIS, GE, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothKE<G, GE, GTL0, GTL1, GTL2, GTL3> &
      CovariantKE<G, GE, GTL0, GTL1, GTL2, GTL3>
  ): <GSIO, GK, GKN extends string, FX, GI, GS, GEnv, A, B>(
    f: (
      a: A
    ) => KindTL<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, FX, GI, GS, GEnv, GE, B>
  ) => <FK, FKN extends string, FSI, FSO, GX, FI, FS, FEnv, FE>(
    fa: HKTTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, GX, FI, FS, FEnv, FE, A>
  ) => KindTL<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN,
    GSIO,
    GSIO,
    GX,
    GI,
    GS,
    GEnv,
    GE,
    HKTTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, FE, B>
  >
}

export interface TraversableF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends CovariantF<F, TL0, TL1, TL2, TL3> {
  readonly foreachF: ForeachF<F, TL0, TL1, TL2, TL3>
}

export interface ForeachK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any> {
  <G, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothF<G, GTL0, GTL1, GTL2, GTL3> & CovariantF<G, GTL0, GTL1, GTL2, GTL3>
  ): <GSIO, GK, GKN extends string, GX, GI, GS, GR, GE, A, B>(
    f: (
      a: A
    ) => HKTTL<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, GX, GI, GS, GR, GE, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FI, FS, FEnv, FE>(
    fa: KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, FE, A>
  ) => HKTTL<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN,
    GSIO,
    GSIO,
    GX,
    GI,
    GS,
    GR,
    GE,
    KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, FE, B>
  >
  <G extends URIS, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothK<G, GTL0, GTL1, GTL2, GTL3> & CovariantK<G, GTL0, GTL1, GTL2, GTL3>
  ): <GSIO, GK, GKN extends string, GX, GI, GS, GEnv, GE, A, B>(
    f: (
      a: A
    ) => KindTL<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, GX, GI, GS, GEnv, GE, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FI, FS, FEnv, FE>(
    fa: KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, FE, A>
  ) => KindTL<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN,
    GSIO,
    GSIO,
    GX,
    GI,
    GS,
    GEnv,
    GE,
    KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, FE, B>
  >
  <G extends URIS, GE, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothKE<G, GE, GTL0, GTL1, GTL2, GTL3> &
      CovariantKE<G, GE, GTL0, GTL1, GTL2, GTL3>
  ): <GSIO, GK, GKN extends string, FX, GI, GS, GEnv, A, B>(
    f: (
      a: A
    ) => KindTL<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, FX, GI, GS, GEnv, GE, B>
  ) => <FK, FKN extends string, FSI, FSO, GX, FI, FS, FEnv, FE>(
    fa: KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, GX, FI, FS, FEnv, FE, A>
  ) => KindTL<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN,
    GSIO,
    GSIO,
    GX,
    GI,
    GS,
    GEnv,
    GE,
    KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, FE, B>
  >
}

export interface TraversableK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends CovariantK<F, TL0, TL1, TL2, TL3> {
  readonly foreachF: ForeachK<F, TL0, TL1, TL2, TL3>
}

export interface ForeachKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> {
  <G, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothF<G, GTL0, GTL1, GTL2, GTL3> & CovariantF<G, GTL0, GTL1, GTL2, GTL3>
  ): <GSIO, GK, GKN extends string, GX, GI, GS, GR, GE, A, B>(
    f: (
      a: A
    ) => HKTTL<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, GX, GI, GS, GR, GE, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FI, FS, FEnv>(
    fa: KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, E, A>
  ) => HKTTL<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN,
    GSIO,
    GSIO,
    GX,
    GI,
    GS,
    GR,
    GE,
    KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, E, B>
  >
  <G extends URIS, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothK<G, GTL0, GTL1, GTL2, GTL3> & CovariantK<G, GTL0, GTL1, GTL2, GTL3>
  ): <GSIO, GK, GKN extends string, GX, GI, GS, GEnv, GE, A, B>(
    f: (
      a: A
    ) => KindTL<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, GX, GI, GS, GEnv, GE, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FI, FS, FEnv>(
    fa: KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, E, A>
  ) => KindTL<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN,
    GSIO,
    GSIO,
    GX,
    GI,
    GS,
    GEnv,
    GE,
    KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, E, B>
  >
  <G extends URIS, GE, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothKE<G, GE, GTL0, GTL1, GTL2, GTL3> &
      CovariantKE<G, GE, GTL0, GTL1, GTL2, GTL3>
  ): <GSIO, GK, GKN extends string, FX, GI, GS, GEnv, A, B>(
    f: (
      a: A
    ) => KindTL<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, FX, GI, GS, GEnv, GE, B>
  ) => <FK, FKN extends string, FSI, FSO, GX, FI, FS, FEnv>(
    fa: KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, GX, FI, FS, FEnv, E, A>
  ) => KindTL<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN,
    GSIO,
    GSIO,
    GX,
    GI,
    GS,
    GEnv,
    GE,
    KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, E, B>
  >
}

export interface TraversableKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends CovariantKE<F, E, TL0, TL1, TL2, TL3> {
  readonly foreachF: ForeachKE<F, E, TL0, TL1, TL2, TL3>
}

export function makeTraversable<
  URI extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>(
  C: CovariantKE<URI, E, TL0, TL1, TL2, TL3>
): (
  _: Omit<
    TraversableKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | keyof CovariantKE<URI, TL0, TL1, TL2, TL3>
  >
) => TraversableKE<URI, E, TL0, TL1, TL2, TL3>
export function makeTraversable<
  URI extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>(
  C: CovariantK<URI, TL0, TL1, TL2, TL3>
): (
  _: Omit<
    TraversableK<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | keyof CovariantK<URI, TL0, TL1, TL2, TL3>
  >
) => TraversableK<URI, TL0, TL1, TL2, TL3>
export function makeTraversable<URI, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  C: CovariantF<URI, TL0, TL1, TL2, TL3>
): (
  _: Omit<
    TraversableF<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | keyof CovariantF<URI, TL0, TL1, TL2, TL3>
  >
) => TraversableF<URI, TL0, TL1, TL2, TL3>
export function makeTraversable<URI>(
  C: CovariantF<URI>
): (
  _: Omit<TraversableF<URI>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => TraversableF<URI> {
  return (_) => ({
    ..._,
    ...C
  })
}

export function implementForeachF<F extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  i: <
    FK,
    FKN extends string,
    A,
    G,
    GSIO,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN extends string,
    GX,
    GI,
    GS,
    GR,
    GE,
    B
  >(_: {
    FK: FK
    FKN: FKN
    A: A
    G: G
    GSIO: GSIO
    GTL0: GTL0
    GTL1: GTL1
    GTL2: GTL2
    GTL3: GTL3
    GK: GK
    GKN: GKN
    GX: GX
    GI: GI
    GS: GS
    GR: GR
    GE: GE
    B: B
  }) => (
    G: IdentityBothF<G, GTL0, GTL1, GTL2, GTL3> & CovariantF<G, GTL0, GTL1, GTL2, GTL3>
  ) => (
    f: (
      a: A
    ) => HKTTL<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, GX, GI, GS, GR, GE, B>
  ) => <FSI, FSO, FX, FIn, FSt, FEnv>(
    fa: KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, A>
  ) => HKTTL<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN,
    GSIO,
    GSIO,
    GX,
    GI,
    GS,
    GR,
    GE,
    KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, E, B>
  >
) => ForeachKE<F, E, TL0, TL1, TL2, TL3>
export function implementForeachF<F extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  i: <
    FErr,
    FK,
    FKN extends string,
    A,
    G,
    GSIO,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN extends string,
    GX,
    GI,
    GS,
    GR,
    GE,
    B
  >(_: {
    FErr: FErr
    FK: FK
    FKN: FKN
    A: A
    G: G
    GSIO: GSIO
    GTL0: GTL0
    GTL1: GTL1
    GTL2: GTL2
    GTL3: GTL3
    GK: GK
    GKN: GKN
    GX: GX
    GI: GI
    GS: GS
    GR: GR
    GE: GE
    B: B
  }) => (
    G: IdentityBothF<G, GTL0, GTL1, GTL2, GTL3> & CovariantF<G, GTL0, GTL1, GTL2, GTL3>
  ) => (
    f: (
      a: A
    ) => HKTTL<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, GX, GI, GS, GR, GE, B>
  ) => <FSI, FSO, FX, FIn, FSt, FEnv>(
    fa: KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => HKTTL<
    G,
    GTL0,
    GTL1,
    GTL2,
    GTL3,
    GK,
    GKN,
    GSIO,
    GSIO,
    GX,
    GI,
    GS,
    GR,
    GE,
    KindTL<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
) => ForeachK<F, TL0, TL1, TL2, TL3>
export function implementForeachF() {
  return () => (i: any) => i()
}
