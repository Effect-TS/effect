import type { SelectKeyOfMatchingValues } from "../utils"

export interface InterpreterResult<E, A>
  extends Record<string, { build: (x: A) => A }> {}

export type InterpreterURI = keyof InterpreterResult<any, any>

export type SelectInterpURIs<E, A, ShapeConstraint> = SelectKeyOfMatchingValues<
  InterpreterResult<E, A>,
  ShapeConstraint
>
