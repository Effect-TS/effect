import type { Scope } from "effect"
import type { Socket } from "node:net"

import { Crypto, Data, Effect, Queue, Ref } from "effect"
import {
  AuthenticationError,
  AuthorizationError,
  ConnectionError,
  ConstraintError,
  DeadlockError,
  LockTimeoutError,
  SerializationError,
  SqlError,
  SqlSyntaxError,
  StatementTimeoutError,
  UniqueViolation,
  UnknownError
} from "effect/sql/SqlError"
import { createConnection } from "node:net"

import type { ClickHouseConfig } from "../src/ClickHouseNativeConfig.ts"

const CLIENT_PROTOCOL_VERSION = 54_000

class ClickHouseNativeError extends Data.TaggedError("ClickHouseNativeError")<{
  readonly cause: unknown
}> {
  override get message(): string {
    return `ClickHouse native protocol failure: ${String(this.cause)}`
  }
}

class ClickHouseServerError extends Data.TaggedError("ClickHouseServerError")<{
  readonly code: number
  readonly name: string
  readonly serverMessage: string
}> {
  override get message(): string {
    return `${this.name} (${this.code}): ${this.serverMessage}`
  }
}

/** Maps protocol failures to Effect's public SQL error contract. */
export const toSqlError = (cause: unknown, operation: string): SqlError => {
  const fields = {
    cause,
    message: cause instanceof Error ? cause.message : String(cause),
    operation
  }
  if (
    !(cause instanceof ClickHouseServerError) &&
    !(typeof cause === "object" && cause !== null &&
      (cause as { readonly _tag?: unknown })._tag === "ClickHouseServerError")
  ) {
    return SqlError.make({ reason: ConnectionError.make(fields) })
  }
  const server = cause as ClickHouseServerError
  if (server.code === 516) {
    return SqlError.make({ reason: AuthenticationError.make(fields) })
  }
  if (server.code === 497) {
    return SqlError.make({ reason: AuthorizationError.make(fields) })
  }
  if ([242, 36, 60, 62].includes(server.code)) {
    return SqlError.make({ reason: SqlSyntaxError.make(fields) })
  }
  if (server.name.includes("LOCK_TIMEOUT")) {
    return SqlError.make({ reason: LockTimeoutError.make(fields) })
  }
  if ([159, 160, 469].includes(server.code) || server.name.includes("TIMEOUT")) {
    return SqlError.make({ reason: StatementTimeoutError.make(fields) })
  }
  if (server.name.includes("DEADLOCK")) {
    return SqlError.make({ reason: DeadlockError.make(fields) })
  }
  if (server.name.includes("SERIALIZATION") || server.name.includes("TRANSACTION_CONFLICT")) {
    return SqlError.make({ reason: SerializationError.make(fields) })
  }
  if (server.name.includes("UNIQUE")) {
    return SqlError.make({ reason: UniqueViolation.make({ ...fields, constraint: server.name }) })
  }
  if (server.name.includes("CONSTRAINT")) {
    return SqlError.make({ reason: ConstraintError.make(fields) })
  }
  return SqlError.make({ reason: UnknownError.make(fields) })
}

interface NativeReader {
  readonly byte: Effect.Effect<number, ClickHouseNativeError>
  readonly bytes: (length: number) => Effect.Effect<Buffer, ClickHouseNativeError>
  readonly int32: Effect.Effect<number, ClickHouseNativeError>
  readonly string: Effect.Effect<string, ClickHouseNativeError>
  readonly varUInt: Effect.Effect<bigint, ClickHouseNativeError>
}

type SocketEvent =
  | { readonly _tag: "Closed" }
  | { readonly _tag: "Data"; readonly value: Buffer }
  | { readonly _tag: "Failure"; readonly error: ClickHouseNativeError }

const takeBytes = (
  events: Queue.Queue<SocketEvent>,
  length: number,
  buffered: Buffer
): Effect.Effect<readonly [Buffer, Buffer], ClickHouseNativeError> =>
  buffered.length >= length
    ? Effect.succeed([buffered.subarray(0, length), buffered.subarray(length)])
    : Queue.take(events).pipe(
      Effect.flatMap((event) => {
        switch (event._tag) {
          case "Closed":
            return new ClickHouseNativeError({
              cause: new Error(`ClickHouse socket closed while reading ${length} bytes`)
            })
          case "Data":
            return takeBytes(events, length, Buffer.concat([buffered, event.value]))
          case "Failure":
            return event.error
        }
      })
    )

const makeNativeReader = (socket: Socket): Effect.Effect<NativeReader, never, Scope.Scope> =>
  Effect.gen(function*() {
    const events = yield* Queue.unbounded<SocketEvent>()
    const buffered = yield* Ref.make<Buffer>(Buffer.alloc(0))
    const onData = (value: Buffer) => {
      Queue.offerUnsafe(events, { _tag: "Data", value: Buffer.from(value) })
    }
    const onError = (cause: Error) => {
      Queue.offerUnsafe(events, { _tag: "Failure", error: new ClickHouseNativeError({ cause }) })
    }
    const onClose = () => {
      Queue.offerUnsafe(events, { _tag: "Closed" })
    }
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        socket.on("data", onData)
        socket.once("error", onError)
        socket.once("close", onClose)
      }),
      () =>
        Effect.sync(() => {
          socket.off("data", onData)
          socket.off("error", onError)
          socket.off("close", onClose)
        })
    )
    const bytes = (length: number): Effect.Effect<Buffer, ClickHouseNativeError> =>
      length < 0
        ? new ClickHouseNativeError({ cause: new RangeError(`Invalid ClickHouse byte length: ${length}`) })
        : buffered.pipe(
          Ref.get,
          Effect.flatMap((value) =>
            takeBytes(events, length, value).pipe(
              Effect.flatMap(([result, rest]) => buffered.pipe(Ref.set(rest), Effect.as(result)))
            )
          )
        )
    const byte = bytes(1).pipe(Effect.map((value) => value.readUInt8()))
    const int32 = bytes(4).pipe(Effect.map((value) => value.readInt32LE()))
    const varUInt: Effect.Effect<bigint, ClickHouseNativeError> = Effect.suspend(() => {
      const read = (shift: bigint, value: bigint): Effect.Effect<bigint, ClickHouseNativeError> =>
        shift >= 70n
          ? new ClickHouseNativeError({ cause: new RangeError("ClickHouse VarUInt exceeds 10 bytes") })
          : bytes(1).pipe(
            Effect.flatMap((buffer) => {
              const byte = buffer.readUInt8()
              const next = value | (BigInt(byte & 0x7f) << shift)

              return (byte & 0x80) === 0 ? Effect.succeed(next) : read(shift + 7n, next)
            })
          )

      return read(0n, 0n)
    })
    const string = varUInt.pipe(
      Effect.flatMap((length) =>
        length > BigInt(Number.MAX_SAFE_INTEGER)
          ? new ClickHouseNativeError({ cause: new RangeError(`ClickHouse string is too large: ${length}`) })
          : bytes(Number(length)).pipe(Effect.map((value) => value.toString()))
      )
    )

    return { byte, bytes, int32, string, varUInt }
  })

const encodeVarUInt = (value: bigint): Buffer => {
  if (value < 0n) {
    throw new RangeError("ClickHouse VarUInt cannot be negative")
  }
  const encode = (remaining: bigint): ReadonlyArray<number> => {
    const byte = Number(remaining & 0x7fn)
    const next = remaining >> 7n

    return next === 0n ? [byte] : [byte | 0x80, ...encode(next)]
  }

  return Buffer.from(encode(value))
}

const encodeString = (value: string): ReadonlyArray<Buffer> => {
  const bytes = Buffer.from(value)

  return [encodeVarUInt(BigInt(bytes.length)), bytes]
}

const encodePacket = (parts: ReadonlyArray<Buffer>): Buffer => Buffer.concat(parts)

const encodeBlockInfo = (): ReadonlyArray<Buffer> => [
  encodeVarUInt(1n),
  Buffer.from([0]),
  encodeVarUInt(2n),
  Buffer.from([0xff, 0xff, 0xff, 0xff]),
  encodeVarUInt(0n)
]

const encodeEmptyBlock = (): ReadonlyArray<Buffer> => [
  ...encodeBlockInfo(),
  encodeVarUInt(0n),
  encodeVarUInt(0n)
]

const write = (socket: Socket, payload: Buffer): Effect.Effect<void, ClickHouseNativeError> =>
  Effect.callback((resume) => {
    socket.write(
      payload,
      (cause) => resume(cause === null || cause === undefined ? Effect.void : new ClickHouseNativeError({ cause }))
    )
  })

const connect = (config: ClickHouseConfig): Effect.Effect<Socket, ClickHouseNativeError> =>
  Effect.callback((resume, signal) => {
    const socket = createConnection({ host: config.host, port: config.port })
    const cleanup = () => {
      socket.off("connect", onConnect)
      socket.off("error", onError)
    }
    const onConnect = () => {
      cleanup()
      socket.setNoDelay(true)
      socket.setKeepAlive(true)
      resume(Effect.succeed(socket))
    }
    const onError = (cause: Error) => {
      cleanup()
      socket.destroy()
      resume(new ClickHouseNativeError({ cause }))
    }
    socket.once("connect", onConnect)
    socket.once("error", onError)
    signal.addEventListener("abort", () => {
      cleanup()
      socket.destroy()
    })
  })

const close = (socket: Socket): Effect.Effect<void> =>
  socket.destroyed
    ? Effect.void
    : Effect.callback((resume) => {
      socket.once("close", () => resume(Effect.void))
      socket.destroy()
    })

interface NativeColumn {
  readonly name: string
  readonly type: string
  readonly values: ReadonlyArray<unknown>
}

const nullableType = (type: string): string | undefined =>
  type.startsWith("Nullable(") && type.endsWith(")") ? type.slice("Nullable(".length, -1) : undefined

const lowCardinalityType = (type: string): string | undefined =>
  type.startsWith("LowCardinality(") && type.endsWith(")") ? type.slice("LowCardinality(".length, -1) : undefined

const decimalType = (type: string): readonly [number, number] | undefined => {
  const match = /^Decimal\((\d+),\s*(\d+)\)$/.exec(type)

  return match === null ? undefined : [Number(match[1]), Number(match[2])]
}

const integerBuffer = (value: bigint, bytes: number): Buffer => {
  const bits = BigInt(bytes * 8)
  const encoded = value < 0n ? (1n << bits) + value : value

  if (bytes === 1) {
    return Buffer.from([Number(encoded)])
  }
  if (bytes === 2) {
    return Buffer.from([Number(encoded & 0xffn), Number((encoded >> 8n) & 0xffn)])
  }
  if (bytes === 4) {
    return Buffer.from(Array.from({ length: 4 }, (_, index) => Number((encoded >> BigInt(index * 8)) & 0xffn)))
  }
  if (bytes === 8) {
    return Buffer.from(Array.from({ length: 8 }, (_, index) => Number((encoded >> BigInt(index * 8)) & 0xffn)))
  }

  return Buffer.from(Array.from({ length: bytes }, (_, index) => Number((encoded >> BigInt(index * 8)) & 0xffn)))
}

const integerValue = (value: unknown, type: string): bigint => {
  try {
    if (typeof value === "bigint") {
      return value
    }
    if (typeof value === "number" && Number.isSafeInteger(value)) {
      return BigInt(value)
    }
    if (typeof value === "string" && /^[-+]?\d+$/.test(value)) {
      return BigInt(value)
    }
  } catch {
    // The error below retains the column type and avoids leaking a thrown value.
  }

  throw new Error(`Expected an integer value for ClickHouse ${type}, received ${String(value)}`)
}

const decimalValue = (value: unknown, precision: number, scale: number, type: string): bigint => {
  const text = typeof value === "bigint" || typeof value === "number" || typeof value === "string" ? String(value) : ""
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(text)
  if (match === null || (match[3]?.length ?? 0) > scale) {
    throw new Error(`Expected a decimal with scale at most ${scale} for ClickHouse ${type}, received ${String(value)}`)
  }
  const whole = match[2]
  const fraction = (match[3] ?? "").padEnd(scale, "0")
  const unscaled = BigInt(`${whole}${fraction}`)
  const signed = match[1] === "-" ? -unscaled : unscaled
  const digits = signed < 0n ? (-signed).toString().length : signed.toString().length
  if (digits > precision) {
    throw new Error(`Decimal value exceeds ClickHouse ${type} precision: ${String(value)}`)
  }

  return signed
}

const dateTime64Value = (value: unknown, scale: number, type: string): bigint => {
  const milliseconds = typeof value === "string"
    ? Date.parse(value)
    : typeof value === "number"
    ? value
    : Number.NaN
  if (!Number.isFinite(milliseconds) || !Number.isSafeInteger(milliseconds)) {
    throw new Error(`Expected an ISO date-time for ClickHouse ${type}, received ${String(value)}`)
  }
  if (scale < 3) {
    return BigInt(Math.trunc(milliseconds / 10 ** (3 - scale)))
  }

  return BigInt(milliseconds) * 10n ** BigInt(scale - 3)
}

const defaultValue = (type: string): unknown => {
  const nullable = nullableType(type)
  if (nullable !== undefined) {
    return null
  }
  if (lowCardinalityType(type) !== undefined) {
    return ""
  }
  if (type === "String" || type.startsWith("FixedString(")) {
    return ""
  }
  if (type.startsWith("DateTime")) {
    return 0
  }
  return 0
}

const encodeColumnValues = (type: string, values: ReadonlyArray<unknown>): ReadonlyArray<Buffer> => {
  const nullable = nullableType(type)
  if (nullable !== undefined) {
    const nulls = Buffer.from(values.map((value) => value === null || value === undefined ? 1 : 0))
    const encoded = encodeColumnValues(nullable, values.map((value) => value ?? defaultValue(nullable)))

    return [nulls, ...encoded]
  }
  const lowCardinality = lowCardinalityType(type)
  if (lowCardinality !== undefined) {
    const dictionary = values.reduce<ReadonlyArray<unknown>>(
      (entries, value) => entries.some((entry) => Object.is(entry, value)) ? entries : [...entries, value],
      []
    )
    const keyBytes = dictionary.length <= 0x100 ? 1 : dictionary.length <= 0x1_0000 ? 2 : 4
    const keyType = keyBytes === 1 ? 0n : keyBytes === 2 ? 1n : 2n
    const keys = Buffer.concat(
      values.map((value) => integerBuffer(BigInt(dictionary.findIndex((entry) => Object.is(entry, value))), keyBytes))
    )

    return [
      integerBuffer(1n, 8),
      integerBuffer(1_536n | keyType, 8),
      integerBuffer(BigInt(dictionary.length), 8),
      ...encodeColumnValues(lowCardinality, dictionary),
      integerBuffer(BigInt(values.length), 8),
      keys
    ]
  }
  if (type === "String") {
    return values.flatMap((value) => encodeString(typeof value === "string" ? value : String(value)))
  }
  const fixedString = /^FixedString\((\d+)\)$/.exec(type)
  if (fixedString !== null) {
    const length = Number(fixedString[1])

    return values.map((value) => {
      const text = Buffer.from(typeof value === "string" ? value : String(value))
      if (text.length > length) {
        throw new Error(`Value exceeds ClickHouse ${type} length`)
      }
      return Buffer.concat([text, Buffer.alloc(length - text.length)])
    })
  }
  const numeric = /^(U?Int)(8|16|32|64)$/.exec(type)
  if (numeric !== null) {
    const signed = numeric[1] === "Int"
    const bytes = Number(numeric[2]) / 8
    const minimum = signed ? -(1n << BigInt(bytes * 8 - 1)) : 0n
    const maximum = signed ? (1n << BigInt(bytes * 8 - 1)) - 1n : (1n << BigInt(bytes * 8)) - 1n

    return values.map((value) => {
      const integer = integerValue(value, type)
      if (integer < minimum || integer > maximum) {
        throw new Error(`Value is out of range for ClickHouse ${type}`)
      }
      return integerBuffer(integer, bytes)
    })
  }
  const floating = /^Float(32|64)$/.exec(type)
  if (floating !== null) {
    return values.map((value) => {
      const number = typeof value === "number" ? value : Number(value)
      if (!Number.isFinite(number)) {
        throw new Error(`Expected a finite value for ClickHouse ${type}`)
      }
      const result = Buffer.alloc(Number(floating[1]) / 8)
      if (type === "Float32") result.writeFloatLE(number)
      else result.writeDoubleLE(number)
      return result
    })
  }
  const decimal = decimalType(type)
  if (decimal !== undefined) {
    const bytes = decimal[0] <= 9 ? 4 : decimal[0] <= 18 ? 8 : 16

    return values.map((value) => integerBuffer(decimalValue(value, decimal[0], decimal[1], type), bytes))
  }
  const dateTime64 = /^DateTime64\((\d+)(?:,\s*'[^']*')?\)$/.exec(type)
  if (dateTime64 !== null) {
    return values.map((value) => integerBuffer(dateTime64Value(value, Number(dateTime64[1]), type), 8))
  }
  if (type.startsWith("DateTime")) {
    return values.map((value) => integerBuffer(dateTime64Value(value, 0, type), 4))
  }

  throw new Error(`Unsupported ClickHouse Native column type for insert: ${type}`)
}

const encodeDataBlock = (columns: ReadonlyArray<NativeColumn>, rows: ReadonlyArray<Record<string, unknown>>): Buffer =>
  encodePacket([
    ...encodeBlockInfo(),
    encodeVarUInt(BigInt(columns.length)),
    encodeVarUInt(BigInt(rows.length)),
    ...columns.flatMap((column) => [
      ...encodeString(column.name),
      ...encodeString(column.type),
      ...encodeColumnValues(
        column.type,
        rows.map((row) => Object.hasOwn(row, column.name) ? row[column.name] : defaultValue(column.type))
      )
    ])
  ])

const readBlockInfo = (reader: NativeReader): Effect.Effect<void, ClickHouseNativeError> =>
  reader.varUInt.pipe(
    Effect.flatMap((field) => {
      if (field === 0n) {
        return Effect.void
      }
      if (field === 1n) {
        return reader.byte.pipe(Effect.asVoid, Effect.andThen(readBlockInfo(reader)))
      }
      if (field === 2n) {
        return reader.int32.pipe(Effect.asVoid, Effect.andThen(readBlockInfo(reader)))
      }

      return new ClickHouseNativeError({ cause: new Error(`Unsupported ClickHouse BlockInfo field ${field}`) })
    })
  )

const readNumberColumn = (
  reader: NativeReader,
  rows: number,
  bytes: number,
  signed: boolean,
  floating: boolean
): Effect.Effect<ReadonlyArray<unknown>, ClickHouseNativeError> =>
  reader.bytes(rows * bytes).pipe(
    Effect.map((data) =>
      Array.from({ length: rows }, (_, index) => {
        const offset = index * bytes
        if (floating) {
          return bytes === 4 ? data.readFloatLE(offset) : data.readDoubleLE(offset)
        }
        if (bytes === 1) {
          return signed ? data.readInt8(offset) : data.readUInt8(offset)
        }
        if (bytes === 2) {
          return signed ? data.readInt16LE(offset) : data.readUInt16LE(offset)
        }
        if (bytes === 4) {
          return signed ? data.readInt32LE(offset) : data.readUInt32LE(offset)
        }
        const value = signed ? data.readBigInt64LE(offset) : data.readBigUInt64LE(offset)

        return value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER)
          ? Number(value)
          : value.toString()
      })
    )
  )

const readValues = <A>(
  rows: number,
  read: Effect.Effect<A, ClickHouseNativeError>,
  values: ReadonlyArray<A> = []
): Effect.Effect<ReadonlyArray<A>, ClickHouseNativeError> =>
  rows === 0
    ? Effect.succeed(values)
    : read.pipe(Effect.flatMap((value) => readValues(rows - 1, read, [...values, value])))

const readColumn = (
  reader: NativeReader,
  type: string,
  rows: number
): Effect.Effect<ReadonlyArray<unknown>, ClickHouseNativeError> => {
  if (rows === 0) {
    return Effect.succeed([])
  }
  if (type === "String" || type.startsWith("FixedString(")) {
    if (type.startsWith("FixedString(")) {
      const length = Number(type.slice("FixedString(".length, -1))

      return reader.bytes(rows * length).pipe(
        Effect.map((data) =>
          Array.from({ length: rows }, (_, index) => data.subarray(index * length, (index + 1) * length).toString())
        )
      )
    }

    return readValues(rows, reader.string)
  }
  if (type === "Bool") {
    return readValues(rows, reader.byte.pipe(Effect.map((value) => value !== 0)))
  }
  const numeric = /^(U?Int)(8|16|32|64)$/.exec(type)
  if (numeric !== null) {
    return readNumberColumn(reader, rows, Number(numeric[2]) / 8, numeric[1] === "Int", false)
  }
  const floating = /^Float(32|64)$/.exec(type)
  if (floating !== null) {
    return readNumberColumn(reader, rows, Number(floating[1]) / 8, false, true)
  }
  if (type === "Date") {
    return readNumberColumn(reader, rows, 2, false, false)
  }
  if (type === "Date32") {
    return readNumberColumn(reader, rows, 4, true, false)
  }
  if (type.startsWith("DateTime")) {
    return readNumberColumn(reader, rows, type.startsWith("DateTime64(") ? 8 : 4, type.startsWith("DateTime64("), false)
  }
  if (type.startsWith("Nullable(") && type.endsWith(")")) {
    return reader.bytes(rows).pipe(
      Effect.flatMap((nulls) =>
        readColumn(reader, type.slice("Nullable(".length, -1), rows).pipe(
          Effect.map((values) => values.map((value, index) => nulls[index] === 1 ? null : value))
        )
      )
    )
  }

  return new ClickHouseNativeError({ cause: new Error(`Unsupported ClickHouse Native column type: ${type}`) })
}

const readColumns = (
  reader: NativeReader,
  remaining: number,
  rows: number,
  columns: ReadonlyArray<NativeColumn> = []
): Effect.Effect<ReadonlyArray<NativeColumn>, ClickHouseNativeError> =>
  remaining === 0
    ? Effect.succeed(columns)
    : reader.string.pipe(
      Effect.flatMap((name) =>
        reader.string.pipe(
          Effect.flatMap((type) =>
            readColumn(reader, type, rows).pipe(
              Effect.flatMap((values) => readColumns(reader, remaining - 1, rows, [...columns, { name, type, values }]))
            )
          )
        )
      )
    )

const readBlock = (reader: NativeReader): Effect.Effect<ReadonlyArray<NativeColumn>, ClickHouseNativeError> =>
  readBlockInfo(reader).pipe(
    Effect.andThen(reader.varUInt),
    Effect.flatMap((columns) =>
      reader.varUInt.pipe(
        Effect.flatMap((rows) => {
          if (columns > BigInt(Number.MAX_SAFE_INTEGER) || rows > BigInt(Number.MAX_SAFE_INTEGER)) {
            return new ClickHouseNativeError({
              cause: new RangeError("ClickHouse block dimensions exceed JavaScript safe integers")
            })
          }

          return readColumns(reader, Number(columns), Number(rows))
        })
      )
    )
  )

const rowsFromBlock = (columns: ReadonlyArray<NativeColumn>): ReadonlyArray<Record<string, unknown>> => {
  const rows = columns[0]?.values.length ?? 0

  return Array.from(
    { length: rows },
    (_, index) => Object.fromEntries(columns.map((column) => [column.name, column.values[index]]))
  )
}

const readException = (reader: NativeReader): Effect.Effect<ClickHouseServerError, ClickHouseNativeError> =>
  reader.int32.pipe(
    Effect.flatMap((code) =>
      reader.string.pipe(
        Effect.flatMap((name) =>
          reader.string.pipe(
            Effect.flatMap((serverMessage) =>
              reader.string.pipe(
                Effect.andThen(reader.byte),
                Effect.as(new ClickHouseServerError({ code, name, serverMessage }))
              )
            )
          )
        )
      )
    )
  )

const drainProgress = (reader: NativeReader): Effect.Effect<void, ClickHouseNativeError> =>
  reader.varUInt.pipe(Effect.andThen(reader.varUInt), Effect.andThen(reader.varUInt), Effect.asVoid)

const drainProfileInfo = (reader: NativeReader): Effect.Effect<void, ClickHouseNativeError> =>
  reader.varUInt.pipe(
    Effect.andThen(reader.varUInt),
    Effect.andThen(reader.varUInt),
    Effect.andThen(reader.byte),
    Effect.andThen(reader.varUInt),
    Effect.andThen(reader.byte),
    Effect.asVoid
  )

const handshake = (
  socket: Socket,
  config: ClickHouseConfig
): Effect.Effect<NativeReader, ClickHouseNativeError | ClickHouseServerError, Scope.Scope> =>
  Effect.gen(function*() {
    const reader = yield* makeNativeReader(socket)
    yield* write(
      socket,
      encodePacket([
        encodeVarUInt(0n),
        ...encodeString("effect-rapid-order"),
        encodeVarUInt(1n),
        encodeVarUInt(0n),
        encodeVarUInt(BigInt(CLIENT_PROTOCOL_VERSION)),
        ...encodeString(config.database),
        ...encodeString(config.user),
        ...encodeString(config.password)
      ])
    )
    const packet = yield* reader.varUInt
    if (packet === 2n) {
      return yield* readException(reader).pipe(Effect.flatMap(Effect.fail))
    }
    if (packet !== 0n) {
      return yield* new ClickHouseNativeError({
        cause: new Error(`Expected ClickHouse ServerHello, received packet ${packet}`)
      })
    }
    yield* reader.string
    yield* reader.varUInt
    yield* reader.varUInt
    const serverRevision = yield* reader.varUInt
    if (serverRevision < 54_000n) {
      return yield* new ClickHouseNativeError({
        cause: new Error(`ClickHouse server protocol ${serverRevision} is too old`)
      })
    }

    return reader
  })

const writeQuery = (
  socket: Socket,
  sql: string,
  queryId: string
): Effect.Effect<void, ClickHouseNativeError> =>
  write(
    socket,
    encodePacket([
      encodeVarUInt(1n),
      ...encodeString(queryId),
      ...encodeString(""),
      encodeVarUInt(2n),
      encodeVarUInt(0n),
      ...encodeString(sql)
    ])
  )

const readResults = (
  reader: NativeReader,
  rows: ReadonlyArray<Record<string, unknown>> = []
): Effect.Effect<ReadonlyArray<Record<string, unknown>>, ClickHouseNativeError | ClickHouseServerError> =>
  reader.varUInt.pipe(
    Effect.flatMap((packet) => {
      if (packet === 5n) {
        return Effect.succeed(rows)
      }
      if (packet === 2n) {
        return readException(reader).pipe(Effect.flatMap(Effect.fail))
      }
      if (packet === 1n) {
        return reader.string.pipe(
          Effect.andThen(readBlock(reader)),
          Effect.flatMap((block) => readResults(reader, [...rows, ...rowsFromBlock(block)]))
        )
      }
      if (packet === 3n) {
        return drainProgress(reader).pipe(Effect.andThen(readResults(reader, rows)))
      }
      if (packet === 6n) {
        return drainProfileInfo(reader).pipe(Effect.andThen(readResults(reader, rows)))
      }

      return new ClickHouseNativeError({ cause: new Error(`Unsupported ClickHouse server packet ${packet}`) })
    })
  )

const readInsertHeader = (
  reader: NativeReader
): Effect.Effect<ReadonlyArray<NativeColumn>, ClickHouseNativeError | ClickHouseServerError> =>
  reader.varUInt.pipe(
    Effect.flatMap((packet) => {
      if (packet === 2n) {
        return readException(reader).pipe(Effect.flatMap(Effect.fail))
      }
      if (packet === 1n) {
        return reader.string.pipe(Effect.andThen(readBlock(reader)))
      }
      if (packet === 3n) {
        return drainProgress(reader).pipe(Effect.andThen(readInsertHeader(reader)))
      }
      if (packet === 6n) {
        return drainProfileInfo(reader).pipe(Effect.andThen(readInsertHeader(reader)))
      }

      return new ClickHouseNativeError({
        cause: new Error(`Expected ClickHouse insert header, received packet ${packet}`)
      })
    })
  )

const execute = (
  socket: Socket,
  reader: NativeReader,
  sql: string,
  queryId: string
): Effect.Effect<ReadonlyArray<Record<string, unknown>>, ClickHouseNativeError | ClickHouseServerError> =>
  writeQuery(socket, sql, queryId).pipe(
    Effect.andThen(write(socket, encodePacket([encodeVarUInt(2n), ...encodeString(""), ...encodeEmptyBlock()]))),
    Effect.andThen(readResults(reader))
  )

const insert = (
  socket: Socket,
  reader: NativeReader,
  sql: string,
  rows: ReadonlyArray<Record<string, unknown>>,
  queryId: string
): Effect.Effect<void, ClickHouseNativeError | ClickHouseServerError> =>
  rows.length === 0
    ? Effect.void
    : writeQuery(socket, sql, queryId).pipe(
      Effect.andThen(write(socket, encodePacket([encodeVarUInt(2n), ...encodeString(""), ...encodeEmptyBlock()]))),
      Effect.andThen(readInsertHeader(reader)),
      Effect.flatMap((columns) =>
        Effect.try({
          catch: (cause) => new ClickHouseNativeError({ cause }),
          try: () => encodeDataBlock(columns, rows)
        }).pipe(
          Effect.flatMap((block) =>
            write(socket, encodePacket([encodeVarUInt(2n), ...encodeString(""), block])).pipe(
              Effect.andThen(
                write(socket, encodePacket([encodeVarUInt(2n), ...encodeString(""), ...encodeEmptyBlock()]))
              ),
              Effect.andThen(readResults(reader)),
              Effect.asVoid
            )
          )
        )
      )
    )

export interface ClickHouseNativeClient {
  readonly execute: (
    sql: string
  ) => Effect.Effect<ReadonlyArray<Record<string, unknown>>, SqlError, Crypto.Crypto>
  readonly insert: (
    sql: string,
    rows: ReadonlyArray<Record<string, unknown>>
  ) => Effect.Effect<void, SqlError, Crypto.Crypto>
  readonly ping: Effect.Effect<void, SqlError>
}

export const makeClickHouseNativeClient = (
  config: ClickHouseConfig
): Effect.Effect<ClickHouseNativeClient, SqlError, Scope.Scope> =>
  Effect.gen(function*() {
    const socket = yield* Effect.acquireRelease(connect(config), close)
    const reader = yield* handshake(socket, config)
    const executeWithId = (sql: string) =>
      Crypto.Crypto.pipe(
        Effect.flatMap((crypto) => crypto.randomUUIDv4),
        Effect.mapError((cause) => new ClickHouseNativeError({ cause })),
        Effect.flatMap((queryId) => execute(socket, reader, sql, queryId)),
        Effect.mapError((cause) => toSqlError(cause, "execute"))
      )
    const insertWithId = (sql: string, rows: ReadonlyArray<Record<string, unknown>>) =>
      Crypto.Crypto.pipe(
        Effect.flatMap((crypto) => crypto.randomUUIDv4),
        Effect.mapError((cause) => new ClickHouseNativeError({ cause })),
        Effect.flatMap((queryId) => insert(socket, reader, sql, rows, queryId)),
        Effect.mapError((cause) => toSqlError(cause, "insert"))
      )
    const ping = write(socket, encodePacket([encodeVarUInt(4n)])).pipe(
      Effect.andThen(reader.varUInt),
      Effect.flatMap((packet) => {
        if (packet === 2n) {
          return readException(reader).pipe(Effect.flatMap(Effect.fail))
        }

        return packet === 4n
          ? Effect.void
          : new ClickHouseNativeError({ cause: new Error(`Expected ClickHouse Pong, received packet ${packet}`) })
      }),
      Effect.mapError((cause) => toSqlError(cause, "ping"))
    )

    return { execute: executeWithId, insert: insertWithId, ping }
  }).pipe(Effect.mapError((cause) => toSqlError(cause, "connect")))

export const withClickHouseNative = <A, E, R>(
  config: ClickHouseConfig,
  use: (client: ClickHouseNativeClient) => Effect.Effect<A, E, R>
): Effect.Effect<A, E | SqlError, Crypto.Crypto | R> =>
  makeClickHouseNativeClient(config).pipe(Effect.flatMap(use), Effect.scoped)
