import { DecoderURI } from "../decoder"
import { DSLFor } from "../dsl"
import { EncoderURI } from "../encoder"
import {
  InterpreterHKT,
  InterpreterKind,
  InterpreterKindF,
  InterpreterURIS
} from "../registry"

import { UnionToIntersection } from "@matechs/preview/Utils"
import { URIS } from "@matechs/preview/_abstract/HKT"

export const PrimitivesURI = "PrimitivesURI"
export type PrimitivesURI = typeof PrimitivesURI

declare module "../registry" {
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
  required: <
    Types extends {
      [k in keyof Types]: InterpreterHKT<IF, F, any, any, any, any>
    }
  >(
    _: Types
  ) => InterpreterHKT<
    IF,
    F,
    CRDec &
      UnionToIntersection<
        {
          [k in keyof Types]: unknown extends Parameters<Types[k]["_RDec"]>[0]
            ? never
            : Parameters<Types[k]["_RDec"]>[0]
        }[keyof Types]
      >,
    CREnc &
      UnionToIntersection<
        {
          [k in keyof Types]: unknown extends Parameters<Types[k]["_REnc"]>[0]
            ? never
            : Parameters<Types[k]["_REnc"]>[0]
        }[keyof Types]
      >,
    {
      [k in keyof Types]: ReturnType<Types[k]["_O"]>
    },
    {
      [k in keyof Types]: ReturnType<Types[k]["_E"]>
    }
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
  required: <
    Types extends {
      [k in keyof Types]: InterpreterKind<IF, F, any, any, any, any>
    }
  >(
    _: Types
  ) => InterpreterKind<
    IF,
    F,
    CRDec &
      UnionToIntersection<
        {
          [k in keyof Types]: Types[k] extends [
            InterpreterKind<IF, F, infer X, any, any, any>
          ]
            ? unknown extends X
              ? never
              : X
            : never
        }[keyof Types]
      >,
    CREnc &
      UnionToIntersection<
        {
          [k in keyof Types]: Types[k] extends [
            InterpreterKind<IF, F, any, infer X, any, any>
          ]
            ? unknown extends X
              ? never
              : X
            : never
        }[keyof Types]
      >,
    {
      [k in keyof Types]: [Types[k]] extends [
        InterpreterKind<IF, F, any, any, infer O, any>
      ]
        ? O
        : never
    },
    {
      [k in keyof Types]: [Types[k]] extends [
        InterpreterKind<IF, F, any, any, any, infer E>
      ]
        ? E
        : never
    }
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
  required: <
    Types extends {
      [k in keyof Types]: InterpreterKindF<IF, F, any, any, any, any>
    }
  >(
    _: Types
  ) => InterpreterKindF<
    IF,
    F,
    CRDec &
      UnionToIntersection<
        {
          [k in keyof Types]: Types[k] extends [
            InterpreterKindF<IF, F, infer X, any, any, any>
          ]
            ? unknown extends X
              ? never
              : X
            : never
        }[keyof Types]
      >,
    CREnc &
      UnionToIntersection<
        {
          [k in keyof Types]: Types[k] extends [
            InterpreterKindF<IF, F, any, infer X, any, any>
          ]
            ? unknown extends X
              ? never
              : X
            : never
        }[keyof Types]
      >,
    {
      [k in keyof Types]: [Types[k]] extends [
        InterpreterKindF<IF, F, any, any, infer O, any>
      ]
        ? O
        : never
    },
    {
      [k in keyof Types]: [Types[k]] extends [
        InterpreterKindF<IF, F, any, any, any, infer E>
      ]
        ? E
        : never
    }
  >
}
