/**
 * SQL Server data type descriptors for native TDS parameters.
 *
 * Pass these values to `MssqlClient.param`, `Procedure.param`, or
 * `Procedure.outputParam`. A descriptor only names a type; `MssqlProtocol`
 * validates and encodes each value before a request is written to the
 * connection, so an invalid value fails the request without reaching the
 * server.
 *
 * @stability unstable
 * @since 4.0.0
 */

/**
 * A SQL Server parameter type descriptor.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface DataType {
  readonly name: string
  /** The TDS type identifier of the declared type. */
  readonly id: number
  /**
   * Returns the value unchanged, or `null` for `undefined`. Values are
   * validated when they are encoded.
   */
  readonly validate: (value: unknown, collation?: unknown) => unknown
}

/**
 * Explicit length, precision, and scale for a parameter.
 * A length of `Infinity` selects a MAX type.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface ParameterOptions {
  readonly length?: number | undefined
  readonly precision?: number | undefined
  readonly scale?: number | undefined
}

/**
 * A column of a table-valued parameter.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface TableColumn extends ParameterOptions {
  readonly name: string
  readonly type: DataType
}

/**
 * A named SQL Server table type and its input rows.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Table {
  readonly name: string
  readonly schema?: string | undefined
  readonly columns: ReadonlyArray<TableColumn>
  readonly rows: ReadonlyArray<ReadonlyArray<unknown>>
}

/**
 * A decoded Time, DateTime2 or DateTimeOffset value retaining its sub-millisecond
 * fraction. For compatibility, `nanosecondsDelta` is a fraction of a second,
 * despite its name, and is non-enumerable. Passing the value back as a temporal
 * parameter preserves that fraction at the parameter's declared scale.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface DateWithNanosecondsDelta extends globalThis.Date {
  readonly nanosecondsDelta: number
}

const validate = (value: unknown): unknown => value ?? null

const make = (name: string, id: number): DataType => ({ name, id, validate })

/**
 * TINYINT, an unsigned 8-bit integer.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const TinyInt: DataType = make("TinyInt", 0x30)

/**
 * SMALLINT, a signed 16-bit integer.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const SmallInt: DataType = make("SmallInt", 0x34)

/**
 * INT, a signed 32-bit integer.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const Int: DataType = make("Int", 0x38)

/**
 * BIGINT, a signed 64-bit integer. Results decode to decimal strings; parameters accept a `bigint`, a safe integer, or an integer string.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const BigInt: DataType = make("BigInt", 0x7f)

/**
 * BIT. Parameters accept a boolean, `0`, or `1`.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const Bit: DataType = make("Bit", 0x32)

/**
 * REAL, a 32-bit float.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const Real: DataType = make("Real", 0x3b)

/**
 * FLOAT, a 64-bit float.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const Float: DataType = make("Float", 0x3e)

/**
 * NVARCHAR, UTF-16 text. A length above 4000 or `Infinity` selects NVARCHAR(MAX).
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const NVarChar: DataType = make("NVarChar", 0xe7)

/**
 * NCHAR, fixed-length UTF-16 text.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const NChar: DataType = make("NChar", 0xef)

/**
 * VARCHAR, text in the connection collation's code page. A length above 8000 or `Infinity` selects VARCHAR(MAX).
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const VarChar: DataType = make("VarChar", 0xa7)

/**
 * CHAR, fixed-length text in the connection collation's code page.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const Char: DataType = make("Char", 0xaf)

/**
 * VARBINARY. Parameters accept a `Uint8Array`. A length above 8000 or `Infinity` selects VARBINARY(MAX).
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const VarBinary: DataType = make("VarBinary", 0xa5)

/**
 * BINARY, fixed-length bytes.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const Binary: DataType = make("Binary", 0xad)

/**
 * DATE, a UTC calendar day.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const Date: DataType = make("Date", 0x28)

/**
 * TIME with a scale of up to 7 fractional digits, 7 by default.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const Time: DataType = make("Time", 0x29)

/**
 * DATETIME, rounded to SQL Server's 1/300 second ticks.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const DateTime: DataType = make("DateTime", 0x3d)

/**
 * DATETIME2 with a scale of up to 7 fractional digits, 7 by default.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const DateTime2: DataType = make("DateTime2", 0x2a)

/**
 * DATETIMEOFFSET. Values are sent and decoded in UTC.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const DateTimeOffset: DataType = make("DateTimeOffset", 0x2b)

/**
 * SMALLDATETIME, rounded to the minute.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const SmallDateTime: DataType = make("SmallDateTime", 0x3a)

/**
 * UNIQUEIDENTIFIER. Parameters accept a UUID string; results decode to upper-case UUID strings.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const UniqueIdentifier: DataType = make("UniqueIdentifier", 0x24)

/**
 * DECIMAL with precision 18 and scale 0 by default. Parameters accept a number, bigint, or decimal string and are rounded to the declared scale.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const Decimal: DataType = make("Decimal", 0x6a)

/**
 * NUMERIC, identical to `Decimal`.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const Numeric: DataType = make("Numeric", 0x6c)

/**
 * MONEY, a fixed-point value with four fractional digits.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const Money: DataType = make("Money", 0x3c)

/**
 * SMALLMONEY, a 32-bit fixed-point value with four fractional digits.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const SmallMoney: DataType = make("SmallMoney", 0x7a)

/**
 * TEXT, a legacy LOB in the connection collation's code page.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const Text: DataType = make("Text", 0x23)

/**
 * NTEXT, a legacy UTF-16 LOB.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const NText: DataType = make("NText", 0x63)

/**
 * IMAGE, a legacy binary LOB.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const Image: DataType = make("Image", 0x22)

/**
 * XML, sent as UTF-16 text.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const Xml: DataType = make("Xml", 0xf1)

/**
 * A table-valued parameter. The value is a `Table`.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const TVP: DataType = make("TVP", 0xf3)

/**
 * The UDT descriptor. UDT results decode to bytes; parameter encoding is not supported.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const UDT: DataType = make("UDT", 0xf0)

/**
 * The SQL_VARIANT descriptor. Variant results decode to their underlying values;
 * parameter encoding is not supported.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const Variant: DataType = make("Variant", 0x62)
