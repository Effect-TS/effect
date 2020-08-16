import { UnionToIntersection } from "@matechs/preview/Utils"
import { URIS } from "@matechs/preview/_abstract/HKT"

export interface InterpreterHKT<URI, F, RDec, REnc, O, E> {
  readonly _URI: URI
  readonly _F: F
  readonly _RDec: (_: RDec) => void
  readonly _REnc: (_: REnc) => void
  readonly _O: () => O
  readonly _E: () => E
}

export interface URItoInterpreter<F extends URIS, RDec, REnc, O, E> {
  _O: O
  _E: E
  _F: F
  _RDec: (_: RDec) => void
  _REnc: (_: REnc) => void
}

export interface URItoInterpreterF<F, RDec, REnc, O, E> {
  _O: O
  _E: E
  _F: F
  _RDec: (_: RDec) => void
  _REnc: (_: REnc) => void
}

export type ITypes = "_O" | "_E" | "_IF" | "_A" | "_F" | "_RDec" | "_REnc"

export type InterpreterURIS = Exclude<
  keyof URItoInterpreter<any, any, any, any, any>,
  ITypes
>

export type InterpreterKind<
  URI extends InterpreterURIS,
  F extends URIS,
  RDec,
  REnc,
  O,
  E
> = URI extends InterpreterURIS ? URItoInterpreter<F, RDec, REnc, O, E>[URI] : any

export type InterpreterKindF<
  URI extends InterpreterURIS,
  F,
  RDec,
  REnc,
  O,
  E
> = URI extends InterpreterURIS ? URItoInterpreterF<F, RDec, REnc, O, E>[URI] : any

export interface AlgebraF<IF, F, RDec, REnc> {
  _IF: IF
  _F: F
  _RDec: (_: RDec) => void
  _REnc: (_: REnc) => void
}

export interface AlgebraK<IF extends InterpreterURIS, F extends URIS, RDec, REnc> {
  _IF: IF
  _F: F
  _RDec: (_: RDec) => void
  _REnc: (_: REnc) => void
}

export interface AlgebraKF<IF extends InterpreterURIS, F, RDec, REnc> {
  _IF: IF
  _F: F
  _RDec: (_: RDec) => void
  _REnc: (_: REnc) => void
}

export type AlgebraURIS = Exclude<
  keyof AlgebraF<never, never, unknown, unknown>,
  ITypes
>

export type InterpretedK<
  AllAlgebra extends AlgebraURIS,
  Interp extends InterpreterURIS,
  F extends URIS,
  RDec,
  REnc
> = UnionToIntersection<AlgebraK<Interp, F, RDec, REnc>[AllAlgebra]>

export type InterpretedKF<
  AllAlgebra extends AlgebraURIS,
  Interp extends InterpreterURIS,
  F,
  RDec,
  REnc
> = UnionToIntersection<AlgebraKF<Interp, F, RDec, REnc>[AllAlgebra]>

export type InterpretedF<
  AllAlgebra extends AlgebraURIS,
  Interp,
  F extends URIS,
  RDec,
  REnc
> = UnionToIntersection<AlgebraF<Interp, F, RDec, REnc>[AllAlgebra]>
