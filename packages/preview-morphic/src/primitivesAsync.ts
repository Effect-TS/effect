import { DecoderURI } from "./decoder"
import { EncoderURI } from "./encoder"
import { DSLFor } from "./primitives"
import {
  InterpreterHKT,
  InterpreterKind,
  InterpreterKindF,
  InterpreterURIS
} from "./registry"

import { AsyncStackURI } from "."

import { URIS } from "@matechs/preview/_abstract/HKT"

export const PrimitivesAsyncURI = "PrimitivesAsyncURI"
export type PrimitivesAsyncURI = typeof PrimitivesAsyncURI

declare module "./registry" {
  export interface AlgebraF<IF, F extends URIS> {
    [PrimitivesAsyncURI]: PrimitivesAsyncF<IF, F>
  }

  export interface AlgebraK<IF extends InterpreterURIS, F extends URIS> {
    [PrimitivesAsyncURI]: PrimitivesAsyncK<IF, F>
  }

  export interface AlgebraKF<IF extends InterpreterURIS, F> {
    [PrimitivesAsyncURI]: PrimitivesAsyncKF<IF, F>
  }
}

export type AsyncStringConfig<F> = {
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

export type AsyncArrayConfig<F, O, E> = {
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

export interface PrimitivesAsyncF<IF, F extends URIS> {
  asyncString: (
    _?: AsyncStringConfig<AsyncStackURI>
  ) => InterpreterHKT<IF, F, string, string>
}

export interface PrimitivesAsyncK<IF extends InterpreterURIS, F extends URIS> {
  asyncString: (
    _?: AsyncStringConfig<AsyncStackURI>
  ) => InterpreterKind<IF, F, string, string>
}

export interface PrimitivesAsyncKF<IF extends InterpreterURIS, F> {
  asyncString: (
    _?: AsyncStringConfig<AsyncStackURI>
  ) => InterpreterKindF<IF, F, string, string>
}
