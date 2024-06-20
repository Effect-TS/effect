/**
 * @since 1.0.0
 */
import type { Row } from "@effect/sql/SqlConnection"
import { identity } from "effect/Function"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import type { Covariant } from "effect/Types"
import type { DataType } from "tedious/lib/data-type.js"
import type { ParameterOptions } from "tedious/lib/request.js"
import * as Parameter from "./Parameter.js"

/**
 * @category type id
 * @since 1.0.0
 */
export const TypeId: unique symbol = Symbol.for("@effect/sql-mssql/Procedure")

/**
 * @category type id
 * @since 1.0.0
 */
export type TypeId = typeof TypeId

/**
 * @category model
 * @since 1.0.0
 */
export interface Procedure<
  I extends Record<string, Parameter.Parameter<any>>,
  O extends Record<string, Parameter.Parameter<any>>,
  A = never
> extends Pipeable {
  readonly [TypeId]: {
    readonly _A: Covariant<A>
  }
  readonly _tag: "Procedure"
  readonly name: string
  readonly params: I
  readonly outputParams: O
}

/**
 * @category model
 * @since 1.0.0
 */
export interface ProcedureWithValues<
  I extends Record<string, Parameter.Parameter<any>>,
  O extends Record<string, Parameter.Parameter<any>>,
  A
> extends Procedure<I, O, A> {
  readonly values: Procedure.ParametersRecord<I>
}

/**
 * @since 1.0.0
 */
export namespace Procedure {
  /**
   * @since 1.0.0
   */
  export type ParametersRecord<
    A extends Record<string, Parameter.Parameter<any>>
  > =
    & {
      readonly [K in keyof A]: A[K] extends Parameter.Parameter<infer T> ? T
        : never
    }
    & {}

  /**
   * @category model
   * @since 1.0.0
   */
  export interface Result<
    O extends Record<string, Parameter.Parameter<any>>,
    A
  > {
    readonly output: ParametersRecord<O>
    readonly rows: ReadonlyArray<A>
  }
}

type Simplify<A> = { [K in keyof A]: A[K] } & {}

const procedureProto = {
  [TypeId]: {
    _A: identity
  },
  _tag: "Procedure",
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * @category constructor
 * @since 1.0.0
 */
export const make = (name: string): Procedure<{}, {}> => {
  const procedure = Object.create(procedureProto)
  procedure.name = name
  procedure.params = {}
  procedure.outputParams = {}
  return procedure
}

/**
 * @category combinator
 * @since 1.0.0
 */
export const param = <A>() =>
<N extends string, T extends DataType>(
  name: N,
  type: T,
  options?: ParameterOptions
) =>
<
  I extends Record<string, Parameter.Parameter<any>>,
  O extends Record<string, Parameter.Parameter<any>>
>(
  self: Procedure<I, O>
): Procedure<Simplify<I & { [K in N]: Parameter.Parameter<A> }>, O> => ({
  ...self,
  params: {
    ...self.params,
    [name]: Parameter.make(name, type, options)
  }
})

/**
 * @category combinator
 * @since 1.0.0
 */
export const outputParam = <A>() =>
<N extends string, T extends DataType>(
  name: N,
  type: T,
  options?: ParameterOptions
) =>
<
  I extends Record<string, Parameter.Parameter<any>>,
  O extends Record<string, Parameter.Parameter<any>>
>(
  self: Procedure<I, O>
): Procedure<I, Simplify<O & { [K in N]: Parameter.Parameter<A> }>> => ({
  ...self,
  outputParams: {
    ...self.outputParams,
    [name]: Parameter.make(name, type, options)
  }
})

/**
 * @category combinator
 * @since 1.0.0
 */
export const withRows = <A extends object = Row>() =>
<
  I extends Record<string, Parameter.Parameter<any>>,
  O extends Record<string, Parameter.Parameter<any>>
>(
  self: Procedure<I, O>
): Procedure<I, O, A> => self as any

/**
 * @category combinator
 * @since 1.0.0
 */
export const compile = <
  I extends Record<string, Parameter.Parameter<any>>,
  O extends Record<string, Parameter.Parameter<any>>,
  A
>(
  self: Procedure<I, O, A>
) =>
(input: Procedure.ParametersRecord<I>): ProcedureWithValues<I, O, A> => ({
  ...self,
  values: input
})
