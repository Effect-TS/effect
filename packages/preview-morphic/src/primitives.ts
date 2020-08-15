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

import { URIS } from "@matechs/preview/_abstract/HKT"

export const PrimitivesURI = "PrimitivesURI"
export type PrimitivesURI = typeof PrimitivesURI

declare module "./registry" {
  export interface AlgebraF<IF, F extends URIS> {
    [PrimitivesURI]: PrimitivesF<IF, F>
  }

  export interface AlgebraK<IF extends InterpreterURIS, F extends URIS> {
    [PrimitivesURI]: PrimitivesK<IF, F>
  }

  export interface AlgebraKF<IF extends InterpreterURIS, F> {
    [PrimitivesURI]: PrimitivesKF<IF, F>
  }
}

export type DSLFor<F> = AsyncStackURI extends F ? AsyncDSL<F> : SyncDSL<F>

export type StringConfig<F> = {
  [DecoderURI]?: (
    _: {
      current: InterpreterKindF<DecoderURI, F, string, string>
    } & DSLFor<F>
  ) => InterpreterKindF<DecoderURI, F, string, string>
  [EncoderURI]?: (
    _: {
      current: InterpreterKindF<EncoderURI, F, string, string>
    } & DSLFor<F>
  ) => InterpreterKindF<EncoderURI, F, string, string>
}

export type ArrayConfig<F, O, E> = {
  [DecoderURI]?: (
    _: {
      child: InterpreterKindF<DecoderURI, F, O, E>
      current: InterpreterKindF<DecoderURI, F, readonly O[], readonly E[]>
    } & DSLFor<F>
  ) => InterpreterKindF<DecoderURI, F, readonly O[], readonly E[]>
  [EncoderURI]?: (
    _: {
      child: InterpreterKindF<EncoderURI, F, O, E>
      current: InterpreterKindF<EncoderURI, F, readonly O[], readonly E[]>
    } & DSLFor<F>
  ) => InterpreterKindF<EncoderURI, F, readonly O[], readonly E[]>
}

export interface PrimitivesF<IF, F extends URIS> {
  string: (_?: StringConfig<F>) => InterpreterHKT<IF, F, string, string>
  array: <O, E>(
    _: InterpreterHKT<IF, F, O, E>,
    __?: ArrayConfig<F, O, E>
  ) => InterpreterHKT<IF, F, readonly O[], readonly E[]>
}

export interface PrimitivesK<IF extends InterpreterURIS, F extends URIS> {
  string: (_?: StringConfig<F>) => InterpreterKind<IF, F, string, string>
  array: <O, E>(
    _: InterpreterKind<IF, F, O, E>,
    __?: ArrayConfig<F, O, E>
  ) => InterpreterKind<IF, F, readonly O[], readonly E[]>
}

export interface PrimitivesKF<IF extends InterpreterURIS, F> {
  string: (_?: StringConfig<F>) => InterpreterKindF<IF, F, string, string>
  array: <O, E>(
    _: InterpreterKindF<IF, F, O, E>,
    __?: ArrayConfig<F, O, E>
  ) => InterpreterKindF<IF, F, readonly O[], readonly E[]>
}
