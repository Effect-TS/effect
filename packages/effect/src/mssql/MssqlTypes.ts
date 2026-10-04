/**
 * Portable SQL Server parameter data types.
 *
 * @since 4.0.0
 */

/**
 * SQL types supported by native SQL Server bound parameters.
 *
 * @category models
 * @since 4.0.0
 */
export type DataType = "NVarChar" | "VarBinary" | "Float" | "BigInt" | "Int" | "Bit" | "DateTime2" | "UniqueIdentifier"

/**
 * Size settings for variable length SQL Server parameters.
 *
 * @category models
 * @since 4.0.0
 */
export interface ParameterOptions {
  readonly length?: number | undefined
}

/**
 * A named input or output parameter encoded in a native SQL Server RPC call.
 *
 * @category models
 * @since 4.0.0
 */
export interface BoundParameter {
  readonly name: string
  readonly type: DataType
  readonly value: unknown
  readonly options?: ParameterOptions | undefined
  readonly output?: boolean | undefined
}

/**
 * Diagnostic fields returned by SQL Server error and informational tokens.
 *
 * @category models
 * @since 4.0.0
 */
export interface ServerError {
  readonly number: number
  readonly state: number
  readonly severity: number
  readonly message: string
  readonly server: string
  readonly procedure: string
  readonly line: number
}

/**
 * Native SQL Server data types for explicit parameter metadata.
 *
 * @category constants
 * @since 4.0.0
 */
export const TYPES = {
  NVarChar: "NVarChar",
  VarBinary: "VarBinary",
  Float: "Float",
  BigInt: "BigInt",
  Int: "Int",
  Bit: "Bit",
  DateTime2: "DateTime2",
  UniqueIdentifier: "UniqueIdentifier"
} as const
