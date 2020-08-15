import { UnionToIntersection } from "@matechs/preview/Utils"
import { URIS } from "@matechs/preview/_abstract/HKT"

export interface InterpreterHKT<URI, F, O, E> {
  readonly _URI: URI
  readonly _F: F
  readonly _O: () => O
  readonly _E: () => E
}

export interface URItoInterpreter<F extends URIS, O, E> {
  _O: O
  _E: E
  _F: F
}

export interface URItoInterpreterF<F, O, E> {
  _O: O
  _E: E
  _F: F
}

export type ITypes = "_O" | "_E" | "_IF" | "_A" | "_F"

export type InterpreterURIS = Exclude<keyof URItoInterpreter<any, any, any>, ITypes>

export type InterpreterKind<
  URI extends InterpreterURIS,
  F extends URIS,
  O,
  E
> = URI extends InterpreterURIS ? URItoInterpreter<F, O, E>[URI] : any

export type InterpreterKindF<
  URI extends InterpreterURIS,
  F,
  O,
  E
> = URI extends InterpreterURIS ? URItoInterpreterF<F, O, E>[URI] : any

export interface AlgebraF<IF, F> {
  _IF: IF
  _F: F
}

export interface AlgebraK<IF extends InterpreterURIS, F extends URIS> {
  _IF: IF
  _F: F
}

export interface AlgebraKF<IF extends InterpreterURIS, F> {
  _IF: IF
  _F: F
}

export type AlgebraURIS = Exclude<keyof AlgebraF<never, never>, ITypes>

export type InterpretedK<
  AllAlgebra extends AlgebraURIS,
  Interp extends InterpreterURIS,
  F extends URIS
> = UnionToIntersection<AlgebraK<Interp, F>[AllAlgebra]>

export type InterpretedKF<
  AllAlgebra extends AlgebraURIS,
  Interp extends InterpreterURIS,
  F
> = UnionToIntersection<AlgebraKF<Interp, F>[AllAlgebra]>

export type InterpretedF<
  AllAlgebra extends AlgebraURIS,
  Interp,
  F extends URIS
> = UnionToIntersection<AlgebraF<Interp, F>[AllAlgebra]>
