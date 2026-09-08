/**
 * SQL Server parameter types for the native TDS client.
 *
 * Pass these values to `MssqlClient.param`, `Procedure.param`, or
 * `Procedure.outputParam`. Parameter encoding validates values before a
 * request is written to the connection.
 *
 * @since 4.0.0
 */
import * as internal from "./internal/tdsRequest.ts"

/**
 * A SQL Server parameter type descriptor.
 *
 * @category models
 * @since 4.0.0
 */
export type DataType = internal.DataType

/**
 * Explicit length, precision, and scale for a parameter.
 * A length of `Infinity` selects a MAX type.
 *
 * @category models
 * @since 4.0.0
 */
export type ParameterOptions = internal.ParameterOptions

/**
 * A named SQL Server table type and its input rows.
 *
 * @category models
 * @since 4.0.0
 */
export type Table = internal.Table

/**
 * The SQL Server TinyInt parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const TinyInt: DataType = internal.TYPES.TinyInt

/**
 * The SQL Server SmallInt parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const SmallInt: DataType = internal.TYPES.SmallInt

/**
 * The SQL Server Int parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const Int: DataType = internal.TYPES.Int

/**
 * The SQL Server BigInt parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const BigInt: DataType = internal.TYPES.BigInt

/**
 * The SQL Server Bit parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const Bit: DataType = internal.TYPES.Bit

/**
 * The SQL Server Real parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const Real: DataType = internal.TYPES.Real

/**
 * The SQL Server Float parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const Float: DataType = internal.TYPES.Float

/**
 * The SQL Server NVarChar parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const NVarChar: DataType = internal.TYPES.NVarChar

/**
 * The SQL Server NChar parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const NChar: DataType = internal.TYPES.NChar

/**
 * The SQL Server VarChar parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const VarChar: DataType = internal.TYPES.VarChar

/**
 * The SQL Server Char parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const Char: DataType = internal.TYPES.Char

/**
 * The SQL Server VarBinary parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const VarBinary: DataType = internal.TYPES.VarBinary

/**
 * The SQL Server Binary parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const Binary: DataType = internal.TYPES.Binary

/**
 * The SQL Server Date parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const Date: DataType = internal.TYPES.Date

/**
 * The SQL Server Time parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const Time: DataType = internal.TYPES.Time

/**
 * The SQL Server DateTime parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const DateTime: DataType = internal.TYPES.DateTime

/**
 * The SQL Server DateTime2 parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const DateTime2: DataType = internal.TYPES.DateTime2

/**
 * The SQL Server DateTimeOffset parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const DateTimeOffset: DataType = internal.TYPES.DateTimeOffset

/**
 * The SQL Server SmallDateTime parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const SmallDateTime: DataType = internal.TYPES.SmallDateTime

/**
 * The SQL Server UniqueIdentifier parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const UniqueIdentifier: DataType = internal.TYPES.UniqueIdentifier

/**
 * The SQL Server Decimal parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const Decimal: DataType = internal.TYPES.Decimal

/**
 * The SQL Server Numeric parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const Numeric: DataType = internal.TYPES.Numeric

/**
 * The SQL Server Money parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const Money: DataType = internal.TYPES.Money

/**
 * The SQL Server SmallMoney parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const SmallMoney: DataType = internal.TYPES.SmallMoney

/**
 * The SQL Server Text parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const Text: DataType = internal.TYPES.Text

/**
 * The SQL Server NText parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const NText: DataType = internal.TYPES.NText

/**
 * The SQL Server Image parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const Image: DataType = internal.TYPES.Image

/**
 * The SQL Server Xml parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const Xml: DataType = internal.TYPES.Xml

/**
 * The SQL Server TVP parameter type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const TVP: DataType = internal.TYPES.TVP

/**
 * The SQL Server UDT descriptor. UDT results decode to bytes; parameter encoding is not supported.
 *
 * @category constants
 * @since 4.0.0
 */
export const UDT: DataType = internal.TYPES.UDT

/**
 * The SQL Server Variant descriptor. Variant results decode to their underlying values; parameter encoding is not supported.
 *
 * @category constants
 * @since 4.0.0
 */
export const Variant: DataType = internal.TYPES.Variant
