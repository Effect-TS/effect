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
  export interface AlgebraF<IF, F extends URIS, RDec, REnc> {
    [PrimitivesURI]: PrimitivesF<IF, F, RDec, REnc>
  }

  export interface AlgebraK<IF extends InterpreterURIS, F extends URIS, RDec, REnc> {
    [PrimitivesURI]: PrimitivesK<IF, F, RDec, REnc>
  }

  export interface AlgebraKF<IF extends InterpreterURIS, F, RDec, REnc> {
    [PrimitivesURI]: PrimitivesKF<IF, F, RDec, REnc>
  }
}

export type DSLFor<F> = AsyncStackURI extends F ? AsyncDSL<F> : SyncDSL<F>

export type StringConfig<F, CRDec, CREnc, RDec, REnc> = {
  [DecoderURI]?: (
    _: {
      current: InterpreterKindF<DecoderURI, F, CRDec, CREnc, string, string>
    } & DSLFor<F>
  ) => InterpreterKindF<DecoderURI, F, RDec, CREnc, string, string>
  [EncoderURI]?: (
    _: {
      current: InterpreterKindF<EncoderURI, F, CRDec, CREnc, string, string>
    } & DSLFor<F>
  ) => InterpreterKindF<EncoderURI, F, CRDec, REnc, string, string>
}

export type ArrayConfig<F, CRDec, CREnc, RDec, REnc, O, E> = {
  [DecoderURI]?: (
    _: {
      child: InterpreterKindF<DecoderURI, F, CRDec, CREnc, O, E>
      current: InterpreterKindF<DecoderURI, F, CRDec, CREnc, readonly O[], readonly E[]>
    } & DSLFor<F>
  ) => InterpreterKindF<DecoderURI, F, RDec, CREnc, readonly O[], readonly E[]>
  [EncoderURI]?: (
    _: {
      child: InterpreterKindF<EncoderURI, F, CRDec, CREnc, O, E>
      current: InterpreterKindF<EncoderURI, F, CRDec, CREnc, readonly O[], readonly E[]>
    } & DSLFor<F>
  ) => InterpreterKindF<EncoderURI, F, CRDec, REnc, readonly O[], readonly E[]>
}

export interface PrimitivesF<IF, F extends URIS, CRDec, CREnc> {
  string: <RDec, REnc>(
    _?: StringConfig<F, CRDec, CREnc, RDec, REnc>
  ) => InterpreterHKT<IF, F, CRDec & RDec, CREnc & REnc, string, string>
  array: <RDecChild, REncChild, RDec, REnc, O, E>(
    _: InterpreterHKT<IF, F, RDecChild, REncChild, O, E>,
    __?: ArrayConfig<F, CRDec & RDecChild, CREnc & REncChild, RDec, REnc, O, E>
  ) => InterpreterHKT<
    IF,
    F,
    CRDec & RDecChild & RDec,
    CREnc & REncChild & REnc,
    readonly O[],
    readonly E[]
  >
}

export interface PrimitivesK<IF extends InterpreterURIS, F extends URIS, CRDec, CREnc> {
  string: <RDec, REnc>(
    _?: StringConfig<F, CRDec, CREnc, RDec, REnc>
  ) => InterpreterKind<IF, F, CRDec & RDec, CREnc & REnc, string, string>
  array: <RDecChild, REncChild, RDec, REnc, O, E>(
    _: InterpreterKind<IF, F, RDecChild, REncChild, O, E>,
    __?: ArrayConfig<F, CRDec & RDecChild, CREnc & REncChild, RDec, REnc, O, E>
  ) => InterpreterKind<
    IF,
    F,
    CRDec & RDecChild & RDec,
    CREnc & REncChild & REnc,
    readonly O[],
    readonly E[]
  >
}

export interface PrimitivesKF<IF extends InterpreterURIS, F, CRDec, CREnc> {
  string: <RDec, REnc>(
    _?: StringConfig<F, CRDec, CREnc, RDec, REnc>
  ) => InterpreterKindF<IF, F, CRDec & RDec, CREnc & REnc, string, string>
  array: <RDecChild, REncChild, RDec, REnc, O, E>(
    _: InterpreterKindF<IF, F, RDecChild, REncChild, O, E>,
    __?: ArrayConfig<F, CRDec & RDecChild, CREnc & REncChild, RDec, REnc, O, E>
  ) => InterpreterKindF<
    IF,
    F,
    CRDec & RDecChild & RDec,
    CREnc & REncChild & REnc,
    readonly O[],
    readonly E[]
  >
}
