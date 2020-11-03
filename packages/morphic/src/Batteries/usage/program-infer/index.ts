import type { Algebra, HKT, InterpreterURIS, Kind } from "../../../HKT"
import type {
  ProgramAlgebra,
  ProgramAlgebraURI,
  ProgramType,
  ProgramURI
} from "../program-type"
import type { AnyConfigEnv } from "../summoner"

export const overloadsSymb = Symbol()

export const interpretable = <T extends { [overloadsSymb]?: any }>(
  program: T
): Overloads<T> => program as Overloads<T>

export type InferredAlgebra<
  F extends InterpreterURIS,
  PURI extends ProgramURI,
  R
> = Algebra<ProgramAlgebraURI[PURI], F, R>

export type Overloads<I extends { [overloadsSymb]?: any }> = NonNullable<
  I[typeof overloadsSymb]
>

export interface InferredProgram<
  R extends AnyConfigEnv,
  E,
  A,
  PURI extends ProgramURI
> {
  <Env extends R>(a: ProgramAlgebra<"HKT", Env>[PURI]): HKT<Env, E, A>
  [overloadsSymb]?: {
    <G extends Exclude<InterpreterURIS, "HKT">>(
      a: Algebra<ProgramAlgebraURI[PURI], G, R>
    ): Kind<G, { [k in G & keyof R]: R[k] }, E, A>
  }
}

export interface Define<PURI extends ProgramURI, R extends AnyConfigEnv = {}> {
  <E, A>(program: ProgramType<R, E, A>[PURI]): ProgramType<R, E, A>[PURI]
}

export const defineFor: <PURI extends ProgramURI>(
  _prog: PURI
) => <R extends AnyConfigEnv = {}>() => Define<PURI, R> = (_) => () => (a) => a
