/**
 * @since 1.0.0
 */
import { identity } from "effect/Function"
import type { DataType } from "tedious/lib/data-type.js"
import type { ParameterOptions } from "tedious/lib/request.js"

/**
 * @category type id
 * @since 1.0.0
 */
export const ParameterId = Symbol.for("@sqlfx/mssql/Parameter")

/**
 * @category type id
 * @since 1.0.0
 */
export type ParameterId = typeof ParameterId

/**
 * @category model
 * @since 1.0.0
 */
export interface Parameter<A> {
  readonly [ParameterId]: (_: never) => A
  readonly _tag: "Parameter"
  readonly name: string
  readonly type: DataType
  readonly options: ParameterOptions
}

/**
 * @category constructor
 * @since 1.0.0
 */
export const make = <A>(
  name: string,
  type: DataType,
  options: ParameterOptions = {}
): Parameter<A> => ({
  [ParameterId]: identity,
  _tag: "Parameter",
  name,
  type,
  options
})
