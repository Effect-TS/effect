import { UnionToIntersection } from "@matechs/preview/Utils"
import { URIS } from "@matechs/preview/_abstract/HKT"

export interface InterpreterHKT<URI, F, R, O, E> {
  readonly _URI: URI
  readonly _F: F
  readonly _R: (_: R) => void
  readonly _O: () => O
  readonly _E: () => E
}

export interface URItoInterpreter<F extends URIS, R, O, E> {
  _O: O
  _E: E
  _F: F
}

export interface URItoInterpreterF<F, R, O, E> {
  _O: O
  _E: E
  _F: F
}

export type ITypes = "_O" | "_E" | "_IF" | "_A" | "_F"

export type InterpreterURIS = Exclude<
  keyof URItoInterpreter<any, any, any, any>,
  ITypes
>

export type InterpreterKind<
  URI extends InterpreterURIS,
  F extends URIS,
  R,
  O,
  E
> = URI extends InterpreterURIS ? URItoInterpreter<F, R, O, E>[URI] : any

export type InterpreterKindF<
  URI extends InterpreterURIS,
  F,
  R,
  O,
  E
> = URI extends InterpreterURIS ? URItoInterpreterF<F, R, O, E>[URI] : any

export interface AlgebraF<IF, F, R> {
  _IF: IF
  _F: F
  _R: (_: R) => void
}

export interface AlgebraK<IF extends InterpreterURIS, F extends URIS, R> {
  _IF: IF
  _F: F
  _R: (_: R) => void
}

export interface AlgebraKF<IF extends InterpreterURIS, F, R> {
  _IF: IF
  _F: F
  _R: (_: R) => void
}

export type AlgebraURIS = Exclude<keyof AlgebraF<never, never, unknown>, ITypes>

export type InterpretedK<
  AllAlgebra extends AlgebraURIS,
  Interp extends InterpreterURIS,
  F extends URIS,
  R
> = UnionToIntersection<AlgebraK<Interp, F, R>[AllAlgebra]>

export type InterpretedKF<
  AllAlgebra extends AlgebraURIS,
  Interp extends InterpreterURIS,
  F,
  R
> = UnionToIntersection<AlgebraKF<Interp, F, R>[AllAlgebra]>

export type InterpretedF<
  AllAlgebra extends AlgebraURIS,
  Interp,
  F extends URIS,
  R
> = UnionToIntersection<AlgebraF<Interp, F, R>[AllAlgebra]>
