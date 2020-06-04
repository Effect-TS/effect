import { MonocleFor } from "../../../adt/monocle"
import type { InterpreterResult, InterpreterURI } from "../interpreter-result"
import { interpretable, Overloads } from "../program-infer"
import type { ProgramURI, ProgramType } from "../program-type"
import {
  InhabitedTypes,
  assignFunction,
  wrapFun,
  assignCallable,
  inhabitTypes
} from "../utils"

export interface ProgramInterpreter<
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI
> {
  <R, E, A>(program: ProgramType<R, E, A>[ProgURI]): InterpreterResult<E, A>[InterpURI]
}

export type Morph<
  R,
  E,
  A,
  InterpURI extends InterpreterURI,
  ProgURI extends ProgramURI
> = InterpreterResult<E, A>[InterpURI] &
  ProgramType<R, E, A>[ProgURI] &
  MorphExtra<R, E, A, InterpURI, ProgURI>

export interface MorphExtra<
  R,
  E,
  A,
  InterpURI extends InterpreterURI,
  ProgURI extends ProgramURI
>
  extends InhabitedTypes<R, E, A>,
    InhabitedInterpreterAndAlbegra<ProgURI, InterpURI>,
    Interpretable<R, E, A, ProgURI> {}

const inhabitInterpreterAndAlbegra = <
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI,
  T
>(
  t: T
): T & InhabitedInterpreterAndAlbegra<ProgURI, InterpURI> =>
  t as T & InhabitedInterpreterAndAlbegra<ProgURI, InterpURI>

export interface InhabitedInterpreterAndAlbegra<
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI
> {
  _P: ProgURI
  _I: InterpURI
}

function interpreteWithProgram<
  R,
  E,
  A,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI
>(
  program: ProgramType<R, E, A>[ProgURI],
  programInterpreter: ProgramInterpreter<ProgURI, InterpURI>
): Morph<R, E, A, InterpURI, ProgURI> & InhabitedTypes<R, E, A> {
  return inhabitInterpreterAndAlbegra(
    inhabitTypes(assignFunction(wrapFun(program as any), programInterpreter(program)))
  )
}

interface Interpretable<R, E, A, ProgURI extends ProgramURI> {
  derive: Overloads<ProgramType<R, E, A>[ProgURI]>
}

export type Materialized<
  R,
  E,
  A,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI
> = Morph<R, E, A, InterpURI, ProgURI> & MonocleFor<A>

export function materialize<
  R,
  E,
  A,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI
>(
  program: ProgramType<R, E, A>[ProgURI],
  programInterpreter: ProgramInterpreter<ProgURI, InterpURI>
): Materialized<R, E, A, ProgURI, InterpURI> {
  const morph = interpreteWithProgram(program, programInterpreter)
  return assignCallable(morph, {
    ...MonocleFor<A>(),
    derive: interpretable(morph)
  })
}
