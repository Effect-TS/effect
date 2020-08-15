import { DecoderURI } from "./decoder"
import { AsyncDSL, SyncDSL } from "./dsl"
import { EncoderURI } from "./encoder"
import {
  InterpreterHKT,
  InterpreterKind,
  InterpreterKindF,
  InterpreterURIS
} from "./registry"

import { AsyncStackURI } from "."

import { UnionToIntersection } from "@matechs/preview/Utils"
import { URIS } from "@matechs/preview/_abstract/HKT"

export const PrimitivesURI = "PrimitivesURI"
export type PrimitivesURI = typeof PrimitivesURI

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
}

export type DSLFor<F> = AsyncStackURI extends F ? AsyncDSL<F> : SyncDSL<F>

export type StringConfig<F, R, RS extends [any, any]> = {
  [DecoderURI]?: (
    _: {
      current: InterpreterKindF<DecoderURI, F, R, string, string>
    } & DSLFor<F>
  ) => InterpreterKindF<DecoderURI, F, RS[0], string, string>
  [EncoderURI]?: (
    _: {
      current: InterpreterKindF<EncoderURI, F, R, string, string>
    } & DSLFor<F>
  ) => InterpreterKindF<EncoderURI, F, RS[1], string, string>
}

export type ArrayConfig<F, R, R2, O, E> = {
  [DecoderURI]?: (
    _: {
      child: InterpreterKindF<DecoderURI, F, R, O, E>
      current: InterpreterKindF<DecoderURI, F, R, readonly O[], readonly E[]>
    } & DSLFor<F>
  ) => InterpreterKindF<DecoderURI, F, R2, readonly O[], readonly E[]>
  [EncoderURI]?: (
    _: {
      child: InterpreterKindF<EncoderURI, F, R, O, E>
      current: InterpreterKindF<EncoderURI, F, R, readonly O[], readonly E[]>
    } & DSLFor<F>
  ) => InterpreterKindF<EncoderURI, F, R2, readonly O[], readonly E[]>
}

export type RS<C> = C extends ArrayConfig<any, any, infer X, any, any>
  ? X extends any[]
    ? UnionToIntersection<
        { [k in keyof X]: unknown extends X[k] ? never : X[k] }[number]
      >
    : unknown
  : unknown

export interface PrimitivesF<IF, F extends URIS, R> {
  string: <R0, R1>(
    _?: StringConfig<F, R, [R0, R1]>
  ) => InterpreterHKT<IF, F, R & R0 & R1, string, string>
  array: <R1, R2, O, E>(
    _: InterpreterHKT<IF, F, R1, O, E>,
    __?: ArrayConfig<F, R & R1, R2, O, E>
  ) => InterpreterHKT<IF, F, R & R1 & R2, readonly O[], readonly E[]>
}

export interface PrimitivesK<IF extends InterpreterURIS, F extends URIS, R> {
  string: <C extends StringConfig<F, R, [any, any]>>(
    _?: C
  ) => InterpreterKind<IF, F, R & RS<C>, string, string>
  array: <R1, R2, O, E>(
    _: InterpreterKind<IF, F, R1, O, E>,
    __?: ArrayConfig<F, R & R1, R2, O, E>
  ) => InterpreterKind<IF, F, R & R1 & R2, readonly O[], readonly E[]>
}

export interface PrimitivesKF<IF extends InterpreterURIS, F, R> {
  string: <C extends StringConfig<F, R, [any, any]>>(
    _?: C
  ) => InterpreterKindF<IF, F, R & RS<C>, string, string>
  array: <R1, R2, O, E>(
    _: InterpreterKindF<IF, F, R1, O, E>,
    __?: ArrayConfig<F, R & R1, R2, O, E>
  ) => InterpreterKindF<IF, F, R & R1 & R2, readonly O[], readonly E[]>
}
