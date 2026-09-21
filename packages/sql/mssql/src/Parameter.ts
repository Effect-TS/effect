/**
 * Typed SQL Server stored procedure parameter metadata.
 *
 * This module builds {@link Parameter} values that pair a stored procedure
 * parameter name with an `MssqlTypes.DataType`, `MssqlTypes.ParameterOptions`, and a
 * phantom TypeScript value type. `Procedure.param` and
 * `Procedure.outputParam` use this metadata, and `MssqlClient.call` forwards it
 * to the native TDS encoder for input and output parameters.
 *
 * @see {@link make} for constructing parameter metadata directly.
 *
 * @since 4.0.0
 */
import { identity } from "effect/Function"
import type { DataType, ParameterOptions } from "./MssqlTypes.ts"

/**
 * Runtime type identifier used to mark SQL Server stored procedure parameter metadata.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId: TypeId = "~@effect/sql-mssql/Parameter"

/**
 * Type-level identifier used to mark SQL Server stored procedure parameter metadata.
 *
 * @category type IDs
 * @since 4.0.0
 */
export type TypeId = "~@effect/sql-mssql/Parameter"

/**
 * Metadata for a SQL Server stored procedure parameter, including its name, SQL data type, options, and phantom value type.
 *
 * @category models
 * @since 4.0.0
 */
export interface Parameter<out A> {
  readonly [TypeId]: (_: never) => A
  readonly _tag: "Parameter"
  readonly name: string
  readonly type: DataType
  readonly options: ParameterOptions
}

/**
 * Creates typed metadata for a SQL Server stored procedure parameter.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = <A>(
  name: string,
  type: DataType,
  options: ParameterOptions = {}
): Parameter<A> => ({
  [TypeId]: identity,
  _tag: "Parameter",
  name,
  type,
  options
})
