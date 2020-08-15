import { DecoderURI } from "./decoder"
import { AsyncDSL, SyncDSL } from "./dsl"
import { EncoderURI } from "./encoder"
import {
  InterpreterHKT,
  InterpreterKind,
  InterpreterKindF,
  InterpreterURIS
} from "./registry"
import { AsyncStackURI } from "./uris"

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

export type ArrayConfig<F, R, RS extends [any, any], O, E> = {
  [DecoderURI]?: (
    _: {
      child: InterpreterKindF<DecoderURI, F, R, O, E>
      current: InterpreterKindF<DecoderURI, F, R, readonly O[], readonly E[]>
    } & DSLFor<F>
  ) => InterpreterKindF<DecoderURI, F, RS[0], readonly O[], readonly E[]>
  [EncoderURI]?: (
    _: {
      child: InterpreterKindF<EncoderURI, F, R, O, E>
      current: InterpreterKindF<EncoderURI, F, R, readonly O[], readonly E[]>
    } & DSLFor<F>
  ) => InterpreterKindF<EncoderURI, F, RS[1], readonly O[], readonly E[]>
}

export interface PrimitivesF<IF, F extends URIS, R> {
  string: <R0, R1>(
    _?: StringConfig<F, R, [R0, R1]>
  ) => InterpreterHKT<IF, F, R & R0 & R1, string, string>
  array: <RI, R0, R1, O, E>(
    _: InterpreterHKT<IF, F, RI, O, E>,
    __?: ArrayConfig<F, R & RI, [R0, R1], O, E>
  ) => InterpreterHKT<IF, F, R & RI & R0 & R1, readonly O[], readonly E[]>
}

export interface PrimitivesK<IF extends InterpreterURIS, F extends URIS, R> {
  string: <R0, R1>(
    _?: StringConfig<F, R, [R0, R1]>
  ) => InterpreterKind<IF, F, R & R0 & R1, string, string>
  array: <RI, R0, R1, O, E>(
    _: InterpreterKind<IF, F, RI, O, E>,
    __?: ArrayConfig<F, R & RI, [R0, R1], O, E>
  ) => InterpreterKind<IF, F, R & RI & R0 & R1, readonly O[], readonly E[]>
}

export interface PrimitivesKF<IF extends InterpreterURIS, F, R> {
  string: <R0, R1>(
    _?: StringConfig<F, R, [R0, R1]>
  ) => InterpreterKindF<IF, F, R & R0 & R1, string, string>
  array: <RI, R0, R1, O, E>(
    _: InterpreterKindF<IF, F, RI, O, E>,
    __?: ArrayConfig<F, R & RI, [R0, R1], O, E>
  ) => InterpreterKindF<IF, F, R & RI & R0 & R1, readonly O[], readonly E[]>
}
