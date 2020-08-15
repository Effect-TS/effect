import { AnyStackF, AsyncStackF, BaseStackF, foldStack, SyncStackF } from "./utils"

import { AsyncStackURI } from "."

import { constant, pipe } from "@matechs/preview/Function"
import { succeedF } from "@matechs/preview/_abstract/DSL/core"
import { HKTTL } from "@matechs/preview/_abstract/HKT"

export interface SyncDSL<F> extends DSL<F>, SyncStackF<F> {}

export interface AsyncDSL<F> extends DSL<F>, AsyncStackF<F> {}

export interface DSL<F> {
  foldStack: <A, B>(f: (_: AsyncStackF<F>) => A, g: (_: SyncStackF<F>) => B) => A | B

  succeed: <A>(
    a: A
  ) => HKTTL<
    F,
    any,
    any,
    any,
    any,
    never,
    never,
    unknown,
    unknown,
    never,
    unknown,
    unknown,
    unknown,
    never,
    A
  >
  recover: <S, SO, K2, KN2 extends string, X2, I2, R2, E2, A2>(
    f: (
      e: string[]
    ) => HKTTL<F, any, any, any, any, K2, KN2, SO, SO, X2, I2, S, R2, E2, A2>
  ) => <K, KN extends string, SI, X, I, R, A>(
    fa: HKTTL<F, any, any, any, any, K, KN, SI, SO, X, I, S, R, string[], A>
  ) => HKTTL<
    F,
    any,
    any,
    any,
    any,
    K2,
    KN2,
    SI,
    SO,
    X | X2,
    I & I2,
    S,
    R & R2,
    E2,
    A | A2
  >
}

export function dsl<F>(_: { K: BaseStackF<F> }): DSL<F> {
  const succeed = <A>(a: A) => succeedF(_.K)(constant(a))

  const recover = <
    K,
    KN extends string,
    SI,
    SO,
    X,
    I,
    S,
    R,
    A,
    K2,
    KN2 extends string,
    X2,
    I2,
    R2,
    E2,
    A2
  >(
    fa: HKTTL<F, any, any, any, any, K, KN, SI, SO, X, I, S, R, string[], A>,
    f: (
      e: string[]
    ) => HKTTL<F, any, any, any, any, K2, KN2, SO, SO, X2, I2, S, R2, E2, A2>
  ) =>
    pipe(
      fa,
      _.K.run,
      _.K.map((e) =>
        e._tag === "Right"
          ? succeedF(_.K)<A | A2, S, SO, SO>(constant(e.right))
          : f(e.left)
      ),
      _.K.flatten
    )

  return {
    succeed,
    recover: (f) => (fa) => recover(fa, f),
    foldStack: (f, g) => foldStack(_.K as AnyStackF<F>)(f, g)
  }
}

export function commonDSL<F>(_: {
  K: BaseStackF<F>
}): AsyncStackURI extends F ? AsyncDSL<F> : SyncDSL<F> {
  const d = dsl(_)
  return {
    ..._.K,
    recover: d.recover,
    succeed: d.succeed,
    foldStack: d.foldStack
  } as any
}
