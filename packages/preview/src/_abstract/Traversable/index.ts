import { CovariantF, CovariantK } from "../Covariant"
import { HKTFull, HKT_, KindFull, URIS } from "../HKT"
import { IdentityBothF, IdentityBothK } from "../IdentityBoth"

export interface ForeachF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any> {
  <G, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothF<G, GTL0, GTL1, GTL2, GTL3> & CovariantF<G, GTL0, GTL1, GTL2, GTL3>
  ): <GSIO, GK, GKN extends string, GX, GI, GS, GR, GE, A, B>(
    f: (
      a: A
    ) => HKTFull<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, GX, GI, GS, GR, GE, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FI, FS, FEnv, FE>(
    fa: HKTFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, FE, A>
  ) => HKTFull<
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
    HKTFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, FE, B>
  >
  <G extends URIS, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothK<G, GTL0, GTL1, GTL2, GTL3> & CovariantK<G, GTL0, GTL1, GTL2, GTL3>
  ): <GSIO, GK, GKN extends string, GX, GI, GS, GEnv, GE, A, B>(
    f: (
      a: A
    ) => KindFull<
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
      B
    >
  ) => <FK, FKN extends string, FSI, FSO, FX, FI, FS, FEnv, FE>(
    fa: HKTFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, FE, A>
  ) => KindFull<
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
    HKTFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, FE, B>
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
    ) => HKTFull<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, GX, GI, GS, GR, GE, B>
  ) => <FK, FKN extends string, FSI, FSO, FX, FI, FS, FEnv, FE>(
    fa: KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, FE, A>
  ) => HKTFull<
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
    KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, FE, B>
  >
  <G extends URIS, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothK<G, GTL0, GTL1, GTL2, GTL3> & CovariantK<G, GTL0, GTL1, GTL2, GTL3>
  ): <GSIO, GK, GKN extends string, GX, GI, GS, GEnv, GE, A, B>(
    f: (
      a: A
    ) => KindFull<
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
      B
    >
  ) => <FK, FKN extends string, FSI, FSO, FX, FI, FS, FEnv, FE>(
    fa: KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, FE, A>
  ) => KindFull<
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
    KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FI, FS, FEnv, FE, B>
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

export function implementForeachF<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>(): (
  i: <FK, FKN extends string, A, G, B>(_: {
    FK: FK
    FKN: FKN
    A: A
    G: G
    B: B
  }) => (
    G: IdentityBothF<G> & CovariantF<G>
  ) => (
    f: (a: A) => HKT_<G, B>
  ) => <FSI, FSO, FX, FIn, FSt, FErr, FEnv>(
    fa: KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => HKT_<
    G,
    KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
) => ForeachK<F, TL0, TL1, TL2, TL3>
export function implementForeachF() {
  return (i: any) => i()
}
