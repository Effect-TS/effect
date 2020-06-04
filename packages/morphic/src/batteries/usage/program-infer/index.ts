import type { Algebra1, Algebra2, Algebra } from "@morphic-ts/algebras/lib/core"
import type { HKT2, Kind, Kind2, URIS, URIS2 } from "@morphic-ts/common/lib/HKT"

import type {
  ProgramURI,
  ProgramAlgebra,
  ProgramAlgebraURI,
  ProgramType
} from "../program-type"
import type { AnyConfigEnv } from "../summoner"

export const overloadsSymb = Symbol()

export const interpretable = <T extends { [overloadsSymb]?: any }>(
  program: T
): Overloads<T> => program as Overloads<T>

export type InferredAlgebra<F, PURI extends ProgramURI, R> = Algebra<
  ProgramAlgebraURI[PURI],
  F,
  R
>

export type Overloads<I extends { [overloadsSymb]?: any }> = NonNullable<
  I[typeof overloadsSymb]
>

export interface InferredProgram<
  R extends AnyConfigEnv,
  E,
  A,
  PURI extends ProgramURI
> {
  <G, Env extends R>(a: ProgramAlgebra<G, Env>[PURI]): HKT2<G, Env, E, A>
  [overloadsSymb]?: {
    <G extends URIS>(a: Algebra1<ProgramAlgebraURI[PURI], G, R>): Kind<
      G,
      { [k in G & keyof R]: R[k] },
      A
    >
    <G extends URIS2>(a: Algebra2<ProgramAlgebraURI[PURI], G, R>): Kind2<
      G,
      { [k in G & keyof R]: R[k] },
      E,
      A
    >
  }
}

export interface Define<PURI extends ProgramURI, R extends AnyConfigEnv = {}> {
  <E, A>(program: ProgramType<R, E, A>[PURI]): ProgramType<R, E, A>[PURI]
}

export const defineFor: <PURI extends ProgramURI>(
  _prog: PURI
) => <R extends AnyConfigEnv = {}>() => Define<PURI, R> = (_) => () => (a) => a
