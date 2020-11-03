import type { InterpreterURIS } from "../../../HKT"
import type { AnyConfigEnv } from "../summoner"

export interface ProgramType<R extends AnyConfigEnv, E, A> {
  _R: (_R: R) => void
  _E: E
  _A: A
}

export declare type ProgramURI = Exclude<
  keyof ProgramType<any, any, any>,
  "_E" | "_A" | "_R"
>

export interface ProgramAlgebra<F extends InterpreterURIS, Env> {
  _F: F
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProgramAlgebraURI {}
