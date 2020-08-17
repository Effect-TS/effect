import { identity } from "../../Function"
import { CovariantF, CovariantK } from "../Covariant"
import { HKTFull, HKT_, KeyFor, KindFull, URIS } from "../HKT"
import { IdentityBothF, IdentityBothK } from "../IdentityBoth"

export interface ForeachWithKeysF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any> {
  <G, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothF<G, GTL0, GTL1, GTL2, GTL3> & CovariantF<G, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GKN extends string,
    GX,
    GI,
    GSIO,
    GS,
    GR,
    GE,
    A,
    B,
    FK,
    FKN extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    FErr
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN>
    ) => HKTFull<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, GX, GI, GS, GR, GE, B>
  ) => (
    fa: HKTFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
    HKTFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
  <G extends URIS, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothK<G, GTL0, GTL1, GTL2, GTL3> & CovariantK<G, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GSIO,
    GKN extends string,
    X,
    In,
    S,
    Env,
    Err,
    A,
    B,
    FK,
    FKN extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    FErr
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN>
    ) => KindFull<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, X, In, S, Env, Err, B>
  ) => (
    fa: HKTFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
    X,
    In,
    S,
    Env,
    Err,
    HKTFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
}

export interface TraversableWithKeysF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends CovariantF<F, TL0, TL1, TL2, TL3> {
  readonly foreachWithKeysF: ForeachWithKeysF<F, TL0, TL1, TL2, TL3>
}

export interface ForeachWithKeysK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> {
  <G, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothF<G, GTL0, GTL1, GTL2, GTL3> & CovariantF<G, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GKN extends string,
    GX,
    GI,
    GSIO,
    GS,
    GR,
    GE,
    A,
    B,
    FK,
    FKN extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    FErr
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN>
    ) => HKTFull<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, GX, GI, GS, GR, GE, B>
  ) => (
    fa: KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
    KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
  <G extends URIS, GTL0 = any, GTL1 = any, GTL2 = any, GTL3 = any>(
    G: IdentityBothK<G, GTL0, GTL1, GTL2, GTL3> & CovariantK<G, GTL0, GTL1, GTL2, GTL3>
  ): <
    GK,
    GSIO,
    GKN extends string,
    X,
    In,
    S,
    Env,
    Err,
    A,
    B,
    FK,
    FKN extends string,
    FSI,
    FSO,
    FX,
    FIn,
    FSt,
    FEnv,
    FErr
  >(
    f: (
      a: A,
      k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN>
    ) => KindFull<G, GTL0, GTL1, GTL2, GTL3, GK, GKN, GSIO, GSIO, X, In, S, Env, Err, B>
  ) => (
    fa: KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
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
    X,
    In,
    S,
    Env,
    Err,
    KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
}

export interface TraversableWithKeysK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends CovariantK<F, TL0, TL1, TL2, TL3> {
  readonly foreachWithKeysF: ForeachWithKeysK<F, TL0, TL1, TL2, TL3>
}

export function implementForeachWithKeysF<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>(): (
  i: <FErr, FK, FKN extends string, A, G, B, FSI, FSO, FX, FIn, FSt, FEnv>(_: {
    _g: G
    _b: B
    _ferr: FErr
    _a: A
    _fkn: FKN
    _fk: FK
  }) => (
    G: IdentityBothF<G> & CovariantF<G>
  ) => (
    f: (a: A, k: KeyFor<F, TL0, TL1, TL2, TL3, FK, FKN>) => HKT_<G, B>
  ) => (
    fa: KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, A>
  ) => HKT_<
    G,
    KindFull<F, TL0, TL1, TL2, TL3, FK, FKN, FSI, FSO, FX, FIn, FSt, FEnv, FErr, B>
  >
) => ForeachWithKeysK<F, TL0, TL1, TL2, TL3>
export function implementForeachWithKeysF() {
  return identity as any
}
