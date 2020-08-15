import {
  AlgebraURIS,
  InterpretedF,
  InterpretedKF,
  InterpreterHKT,
  InterpreterKind,
  InterpreterKindF,
  InterpreterURIS
} from "./registry"

import * as A from "@matechs/preview/Array"
import * as E from "@matechs/preview/Either"
import {} from "@matechs/preview/Effect"
import { constant, identity, pipe } from "@matechs/preview/Function"
import { intersect } from "@matechs/preview/Utils"
import { ApplicativeF, ApplicativeK } from "@matechs/preview/_abstract/Applicative"
import { succeedF } from "@matechs/preview/_abstract/DSL/core"
import { FailF, FailK } from "@matechs/preview/_abstract/FX/Fail"
import { RunF } from "@matechs/preview/_abstract/FX/Run"
import { ErrFor, HKTFix, KindFix, URIS } from "@matechs/preview/_abstract/HKT"
import { MonadF, MonadK } from "@matechs/preview/_abstract/Monad"
import { RunK } from "packages/preview/src/_abstract/FX/Run"

export const PrimitivesURI = "PrimitivesURI"
export type PrimitivesURI = typeof PrimitivesURI

export const DecoderURI = "DecoderURI"
export type DecoderURI = typeof DecoderURI

type KindREA<F extends URIS, R, E, A> = KindFix<
  F,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  R,
  E,
  A
>

type HKTREA<F, R, E, A> = HKTFix<
  F,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  R,
  E,
  A
>

export interface Decoder<F extends URIS, R, O> {
  (i: unknown): KindREA<F, R, string[], O>
}

export interface DecoderF<F, R, O> {
  (i: unknown): HKTREA<F, R, string[], O>
}

export const EncoderURI = "EncoderURI"
export type EncoderURI = typeof EncoderURI

export interface Encoder<F extends URIS, R, O, E> {
  encode: (i: O) => KindREA<F, R, never, E>
}

export interface EncoderF<F, R, O, E> {
  encode: (i: O) => HKTREA<F, R, never, E>
}

declare module "./registry" {
  export interface AlgebraF<IF, F extends URIS, R> {
    [PrimitivesURI]: PrimitivesF<IF, F, R>
  }

  export interface AlgebraK<IF extends InterpreterURIS, F extends URIS, R> {
    [PrimitivesURI]: PrimitivesK<IF, F, R>
  }

  export interface AlgebraKF<IF extends InterpreterURIS, F, R> {
    [PrimitivesURI]: PrimitivesKF<IF, F, R>
  }

  export interface URItoInterpreter<F extends URIS, R, O, E> {
    [DecoderURI]: Decoder<F, R, O>
    [EncoderURI]: Encoder<F, R, O, E>
  }

  export interface URItoInterpreterF<F, R, O, E> {
    [DecoderURI]: DecoderF<F, R, O>
    [EncoderURI]: EncoderF<F, R, O, E>
  }
}

export type StringConfig<F, R> = {
  [DecoderURI]?: (
    _: {
      current: InterpreterKindF<DecoderURI, F, R, string, string>
    } & DSL<F>
  ) => InterpreterKindF<DecoderURI, F, R, string, string>
  [EncoderURI]?: (
    _: {
      current: InterpreterKindF<EncoderURI, F, R, string, string>
    } & DSL<F>
  ) => InterpreterKindF<EncoderURI, F, R, string, string>
}

export type ArrayConfig<F, R, O, E> = {
  [DecoderURI]?: (
    _: {
      child: InterpreterKindF<DecoderURI, F, R, O, E>
      current: InterpreterKindF<DecoderURI, F, R, readonly O[], readonly E[]>
    } & DSL<F>
  ) => InterpreterKindF<DecoderURI, F, R, readonly O[], readonly E[]>
  [EncoderURI]?: (
    _: {
      child: InterpreterKindF<EncoderURI, F, R, O, E>
      current: InterpreterKindF<EncoderURI, F, R, readonly O[], readonly E[]>
    } & DSL<F>
  ) => InterpreterKindF<EncoderURI, F, R, readonly O[], readonly E[]>
}

export interface DSL<F> {
  K: StackF<F>
  idErr: (_: string[]) => ErrFor<F, any, any, any, any, string[]>
  invIdErr: (_: ErrFor<F, any, any, any, any, string[]>) => string[]
  fail: (
    e: string[]
  ) => HKTFix<
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
    string[],
    never
  >
  succeed: <A>(
    a: A
  ) => HKTFix<
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
  recover: <
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
    SO2,
    X2,
    I2,
    R2,
    E2,
    A2
  >(
    fa: HKTFix<F, any, any, any, any, K, KN, SI, SO, X, I, S, R, string[], A>,
    f: (
      e: string[]
    ) => HKTFix<F, any, any, any, any, K2, KN2, SO, SO, X2, I2, S, R2, E2, A2>
  ) => HKTFix<
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

function dsl<F>(_: {
  K: StackF<F>
  idErr: (_: string[]) => ErrFor<F, any, any, any, any, string[]>
  invIdErr: (_: ErrFor<F, any, any, any, any, string[]>) => string[]
}): DSL<F> {
  const fail = (e: string[]) => _.K.fail(_.idErr(e))
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
    SO2,
    X2,
    I2,
    R2,
    E2,
    A2
  >(
    fa: HKTFix<F, any, any, any, any, K, KN, SI, SO, X, I, S, R, string[], A>,
    f: (
      e: string[]
    ) => HKTFix<F, any, any, any, any, K2, KN2, SO, SO, X2, I2, S, R2, E2, A2>
  ) =>
    pipe(
      fa,
      _.K.run,
      _.K.map((e) =>
        e._tag === "Right"
          ? succeedF(_.K)<A | A2, S, SO, SO>(constant(e.right))
          : f(_.invIdErr(e.left))
      ),
      _.K.flatten
    )

  return {
    ..._,
    fail,
    succeed,
    recover
  }
}

export interface PrimitivesF<IF, F extends URIS, R> {
  string: (_?: StringConfig<F, R>) => InterpreterHKT<IF, F, R, string, string>
  array: <O, E>(
    _: InterpreterHKT<IF, F, R, O, E>,
    __?: ArrayConfig<F, R, O, E>
  ) => InterpreterHKT<IF, F, R, readonly O[], readonly E[]>
}

export interface PrimitivesK<IF extends InterpreterURIS, F extends URIS, R> {
  string: (_?: StringConfig<F, R>) => InterpreterKind<IF, F, R, string, string>
  array: <O, E>(
    _: InterpreterKind<IF, F, R, O, E>,
    __?: ArrayConfig<F, R, O, E>
  ) => InterpreterKind<IF, F, R, readonly O[], readonly E[]>
}

export interface PrimitivesKF<IF extends InterpreterURIS, F, R> {
  string: (_?: StringConfig<F, R>) => InterpreterKindF<IF, F, R, string, string>
  array: <O, E>(
    _: InterpreterKindF<IF, F, R, O, E>,
    __?: ArrayConfig<F, R, O, E>
  ) => InterpreterKindF<IF, F, R, readonly O[], readonly E[]>
}

export type Program<P extends AlgebraURIS, O, E> = <IF, F extends URIS, R>(
  I: InterpretedF<P, IF, F, R>
) => InterpreterHKT<IF, F, R, O, E>

export function makeProgram<P extends AlgebraURIS>(): <O, E>(
  program: Program<P, O, E>
) => Program<P, O, E> {
  return (f) => (I) => f(I)
}

export function makeInterpreter<
  P extends AlgebraURIS,
  IF extends InterpreterURIS,
  F
>(): <R>(
  _: InterpretedKF<P, IF, F, R>
) => <O, E>(program: Program<P, O, E>) => InterpreterKindF<IF, F, R, O, E>
export function makeInterpreter<P extends AlgebraURIS, IF, F extends URIS>(): <R>(
  _: InterpretedF<P, IF, F, R>
) => <O, E>(program: Program<P, O, E>) => InterpreterHKT<IF, F, R, O, E>
export function makeInterpreter<P extends AlgebraURIS, IF, F extends URIS>(): <R>(
  _: InterpretedF<P, IF, F, R>
) => <O, E>(program: Program<P, O, E>) => InterpreterHKT<IF, F, R, O, E> {
  return (_) => (program) => program(_)
}

export type StackF<F> = MonadF<F> & FailF<F> & RunF<F> & ApplicativeF<F>

export type StackK<F extends URIS> = MonadK<F> & FailK<F> & RunK<F> & ApplicativeK<F>

function primitivesDecoder<F extends URIS>(
  F: StackK<F>,
  idErr: (_: string[]) => ErrFor<F, any, any, any, any, string[]>,
  invIdErr: (_: ErrFor<F, any, any, any, any, string[]>) => string[]
): <O, E>(
  program: Program<PrimitivesURI, O, E>
) => InterpreterKind<DecoderURI, F, unknown, O, E>
function primitivesDecoder<F>(
  F: StackF<F>,
  idErr: (_: string[]) => ErrFor<F, any, any, any, any, string[]>,
  invIdErr: (_: ErrFor<F, any, any, any, any, string[]>) => string[]
): <O, E>(
  program: Program<PrimitivesURI, O, E>
) => InterpreterKindF<DecoderURI, F, unknown, O, E> {
  return makeInterpreter<PrimitivesURI, DecoderURI, F>()({
    array: (D, c) => {
      if (c) {
        const md = c[DecoderURI]

        if (md) {
          return md({
            child: D,
            current: arrayDecoder(F, D, invIdErr, idErr),
            ...dsl({ K: F, idErr, invIdErr })
          })
        }
      }
      return arrayDecoder(F, D, invIdErr, idErr)
    },
    string: (c) => {
      if (c) {
        const md = c[DecoderURI]

        if (md) {
          return md({
            current: stringDecoder<F>(F, idErr),
            ...dsl({ K: F, idErr, invIdErr })
          })
        }
      }
      return stringDecoder<F>(F, idErr)
    }
  })
}

export const decodeEither = primitivesDecoder(
  intersect(E.Monad, E.Applicative, E.Run, E.Fail),
  identity,
  identity
)

export const make = makeProgram<AlgebraURIS>()

function arrayDecoder<F, O>(
  F: StackF<F>,
  D: DecoderF<F, unknown, O>,
  invIdErr: (_: ErrFor<F, any, any, any, any, string[]>) => string[],
  idErr: (_: string[]) => ErrFor<F, any, any, any, any, string[]>
): DecoderF<F, unknown, readonly O[]> {
  return (i) => {
    if (typeof i === "object" && Array.isArray(i)) {
      return pipe(
        i,
        A.foreachF(F)((v) => F.run(D(v))),
        F.map((ae) => {
          const errors = [] as string[]
          const decoded = [] as any[]

          for (let k = 0; k < ae.length; k++) {
            const d = ae[k]

            if (d._tag === "Left") {
              errors.push(...d.left)
            } else {
              decoded.push(d.right)
            }
          }

          if (errors.length > 0) {
            return F.fail(idErr(errors))
          } else {
            return succeedF(F)(constant(decoded))
          }
        }),
        F.flatten
      )
    } else {
      return F.fail(idErr(["not an array"]))
    }
  }
}

function stringDecoder<F>(
  F: StackF<F>,
  idErr: (_: string[]) => ErrFor<F, any, any, any, any, string[]>
): DecoderF<F, unknown, string> {
  return (i) =>
    typeof i === "string" ? succeedF(F)(constant(i)) : F.fail(idErr(["not a string"]))
}
